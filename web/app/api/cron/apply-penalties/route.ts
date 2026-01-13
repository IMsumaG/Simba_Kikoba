import * as admin from 'firebase-admin';
import { NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';

// Re-implement types locally for server side to avoid import issues with client-side code
type Transaction = {
    id: string;
    type: string;
    category?: string;
    amount: number;
    date: string;
    penaltyApplied?: boolean;
    memberId: string;
    memberName?: string;
};

export async function GET(request: Request) {
    try {
        // 1. Authorization
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        console.log('[Cron] Starting overdue Dharura loan penalty check...');

        // 2. Query all active Dharura loans
        // We can't easily filter by date calculation in Firestore without storing a "dueDate" field.
        // So we query all active Dharura loans and filter in memory.
        const snapshot = await adminDb.collection('transactions')
            .where('type', '==', 'Loan')
            .where('category', '==', 'Dharura')
            .where('status', '==', 'Completed') // Assuming active/issued loans
            .get();

        if (snapshot.empty) {
            return NextResponse.json({ success: true, message: 'No active Dharura loans found.' });
        }

        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const now = new Date();
        const candidates: { ref: any, data: Transaction }[] = [];

        snapshot.forEach((doc: any) => {
            const data = doc.data() as Transaction;

            // Skip if penalty already applied
            if (data.penaltyApplied) {
                return;
            }

            const issueDate = new Date(data.date);
            const diffTime = now.getTime() - issueDate.getTime();

            // Strictly > 30 days
            if (diffTime > THIRTY_DAYS_MS) {
                candidates.push({ ref: doc.ref, data: { ...data, id: doc.id } });
            }
        });

        if (candidates.length === 0) {
            return NextResponse.json({ success: true, message: 'No overdue loans requiring penalties.' });
        }

        console.log(`[Cron] Found ${candidates.length} overdue loans. Applying penalties...`);

        // 3. Apply Penalties in Batches (max 500 per batch)
        const batches = [];
        let batch = adminDb.batch();
        let operationCount = 0;

        for (const candidate of candidates) {
            const currentAmount = candidate.data.amount;
            const PENALTY_AMOUNT = 60000;
            const newAmount = currentAmount + PENALTY_AMOUNT;

            batch.update(candidate.ref, {
                amount: newAmount,
                penaltyApplied: true,
                penaltyDate: now.toISOString(),
                originalAmountBeforePenalty: currentAmount,
                lastUpdatedBy: 'System Cron'
            });

            // Log activity (optional: create audit logs for each)
            // For bulk operations, we might want to log a single summary or individual logs.
            // Individual logs might overwhelm if many. Let's create individual logs for traceability.
            const newLogRef = adminDb.collection('activityLogs').doc();
            batch.set(newLogRef, {
                activityType: 'loan_penalty_applied',
                userId: 'SYSTEM_CRON',
                userEmail: 'cron@system',
                userName: 'System Cron',
                userRole: 'Admin',
                entityType: 'loan',
                entityId: candidate.data.id,
                description: `Penalty of 60,000 TZS applied to overdue Dharura loan via Cron`,
                metadata: {
                    loanId: candidate.data.id,
                    penaltyAmount: 60000,
                    loanType: 'Dharura',
                    platform: 'Cron'
                },
                changes: {
                    after: {
                        amount: newAmount,
                        penaltyApplied: true
                    }
                },
                status: 'success',
                groupCode: 'DEFAULT', // Since we don't have user context easily, use DEFAULT or fetch user.
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdAtISO: now.toISOString()
            });

            operationCount++;

            // Commit batch if full
            if (operationCount >= 200) { // Conservative limit (2 ops per loan: update + log)
                batches.push(batch.commit());
                batch = adminDb.batch();
                operationCount = 0;
            }
        }

        if (operationCount > 0) {
            batches.push(batch.commit());
        }

        await Promise.all(batches);

        return NextResponse.json({
            success: true,
            message: `Successfully applied penalties to ${candidates.length} loans.`,
            processedCount: candidates.length
        });

    } catch (error: any) {
        console.error('[Cron] Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
