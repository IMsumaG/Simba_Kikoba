import { collection, getDocs, query, runTransaction, where } from 'firebase/firestore';
import { Transaction } from '../types';
import { activityLogger } from './activityLogger';
import { db } from './firebase';

export const penaltyService = {
    /**
     * Checks and applies penalties for overdue Dharura loans.
     * Penalty: 60,000 TZS flat fee for Dharura loans older than 30 days.
     * Uses Firestore transactions to ensure atomicity and prevent double-application.
     * 
     * @param memberId The ID of the member to check
     */
    async checkAndApplyPenalties(memberId: string) {
        try {
            // 1. Identification Phase: Find potential candidates
            // We look for Dharura loans that might be overdue
            // We explicitly filter by 'Dharura' category as requested
            const loansQuery = query(
                collection(db, 'transactions'),
                where('memberId', '==', memberId),
                where('type', '==', 'Loan'),
                where('category', '==', 'Dharura'),
                where('status', '==', 'Completed') // Assuming active loans are 'Completed' transactions in history, or is there another status? 
                // Based on types/index.ts, Transaction status is 'Completed' | 'Pending'. 
                // We assume 'Completed' means the loan was issued. Repayment status is calculated dynamically usually, 
                // but here we just want to flag the loan transaction itself.
            );

            const snapshot = await getDocs(loansQuery);
            const candidates: { ref: any; data: Transaction }[] = [];
            const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
            const now = new Date();

            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data() as Transaction;

                // Check if penalty already applied (using a custom field we are adding)
                if ((data as any).penaltyApplied) {
                    return;
                }

                const issueDate = new Date(data.date);
                const diffTime = now.getTime() - issueDate.getTime();

                // Strictly > 30 days
                // 30 days is exactly 30 * 24h. The prompt says "If days > 30". 
                // So if it's 30 days and 1 second, it triggers.
                if (diffTime > THIRTY_DAYS_MS) {
                    candidates.push({ ref: docSnap.ref, data });
                }
            });

            if (candidates.length === 0) {
                return; // Nothing to do
            }

            console.log(`Found ${candidates.length} overdue Dharura loans for member ${memberId}. Applying penalties...`);

            // 2. Transaction Phase: Apply penalties atomically
            await runTransaction(db, async (transaction) => {
                // Re-read all candidates to ensure they haven't changed
                const reads = await Promise.all(candidates.map(c => transaction.get(c.ref)));

                for (const docSnap of reads) {
                    if (!docSnap.exists()) continue;

                    const data = docSnap.data() as Transaction;

                    // Double-check constraint inside transaction
                    if ((data as any).penaltyApplied) {
                        continue;
                    }

                    const currentAmount = data.amount;
                    const PENALTY_AMOUNT = 60000;
                    const newAmount = currentAmount + PENALTY_AMOUNT;

                    // Update the loan transaction
                    transaction.update(docSnap.ref, {
                        amount: newAmount,
                        penaltyApplied: true,
                        penaltyDate: new Date().toISOString(),
                        originalAmountBeforePenalty: currentAmount // Optional: audit trail
                    } as any);

                    // Note: We are NOT logging to activityLogger here because we can't await async calls 
                    // inside the transaction that aren't part of the transaction object easily 
                    // without side effects if it retries. 
                    // We will log after success.
                }
            });

            // 3. Post-Transaction Phase: Logging
            // We log separately because activityLogger might use its own batch/transaction logic
            // and we don't want to couple it tightly or cause retry issues.
            try {
                const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', memberId)));
                if (!userDoc.empty) {
                    const userData = userDoc.docs[0].data();
                    const profile = { uid: memberId, ...userData } as any;

                    for (const candidate of candidates) {
                        await activityLogger.logActivity({
                            activityType: 'loan_penalty_applied',
                            userId: memberId,
                            userEmail: profile.email || '',
                            userName: profile.displayName || 'Unknown',
                            userRole: profile.role || 'Member',
                            entityType: 'loan',
                            entityId: candidate.ref.id,
                            entityName: profile.displayName || 'Unknown',
                            affectedMemberId: profile.memberId || '',
                            description: `Penalty of 60,000 TZS applied to overdue Dharura loan from ${new Date(candidate.data.date).toLocaleDateString()}`,
                            metadata: {
                                loanId: candidate.ref.id,
                                penaltyAmount: 60000,
                                originalAmount: candidate.data.amount,
                                newAmount: candidate.data.amount + 60000,
                                loanType: 'Dharura'
                            },
                            changes: {
                                after: {
                                    amount: candidate.data.amount + 60000,
                                    penaltyApplied: true,
                                    penaltyDate: new Date().toISOString()
                                }
                            },
                            status: 'success',
                            groupCode: profile.groupCode || 'DEFAULT'
                        });
                    }
                }
            } catch (logError) {
                console.warn('Failed to log penalty activity:', logError);
            }

        } catch (error) {
            console.error("Error applying loan penalties:", error);
            // Don't throw, just log. We don't want to crash the app initialization for this.
        }
    }
};
