import { collection, getDocs, query, runTransaction, where } from 'firebase/firestore';
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
                where('status', '==', 'Completed')
            );

            const snapshot = await getDocs(loansQuery);
            const candidates: { ref: any; data: any }[] = [];
            const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
            const now = new Date();

            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data() as any;

                // Check if penalty already applied
                if (data.penaltyApplied) {
                    return;
                }

                const issueDate = new Date(data.date);
                const diffTime = now.getTime() - issueDate.getTime();

                // Strictly > 30 days
                if (diffTime > THIRTY_DAYS_MS) {
                    candidates.push({ ref: docSnap.ref, data });
                }
            });

            if (candidates.length === 0) {
                return; // Nothing to do
            }

            console.log(`[Web] Found ${candidates.length} overdue Dharura loans for member ${memberId}. Applying penalties...`);

            // 2. Transaction Phase: Apply penalties atomically
            await runTransaction(db, async (transaction) => {
                // Re-read all candidates to ensure they haven't changed
                const reads = await Promise.all(candidates.map(c => transaction.get(c.ref)));

                for (const docSnap of reads) {
                    if (!docSnap.exists()) continue;

                    const data = docSnap.data() as any;

                    // Double-check constraint
                    if (data.penaltyApplied) {
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
                        originalAmountBeforePenalty: currentAmount
                    });
                }
            });

            // 3. Post-Transaction Phase: Logging
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
                            description: `Penalty of 60,000 TZS applied to overdue Dharura loan from ${new Date(candidate.data.date).toLocaleDateString()}`,
                            metadata: {
                                loanId: candidate.ref.id,
                                penaltyAmount: 60000,
                                loanType: 'Dharura',
                                platform: 'Web'
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
            console.error("[Web] Error applying loan penalties:", error);
        }
    }
};
