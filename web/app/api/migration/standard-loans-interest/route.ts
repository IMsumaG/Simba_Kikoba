import { adminDb } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        // Verify authentication
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];

        // Verify the Firebase ID token
        const admin = await import('firebase-admin');
        const decodedToken = await admin.auth().verifyIdToken(token);

        // Verify the user is an admin
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists || userDoc.data()?.role !== 'Admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        // Get all transactions
        const transactionsSnapshot = await adminDb.collection('transactions').get();
        let updatedCount = 0;

        // Use batch for efficient updates
        const batch = adminDb.batch();

        transactionsSnapshot.forEach((doc) => {
            const data = doc.data();

            // Only process Standard loans without originalAmount
            if (
                data.type === 'Loan' &&
                data.category === 'Standard' &&
                !data.originalAmount
            ) {
                // The current amount is the original amount (no interest was applied)
                const originalAmount = data.amount;
                const totalWithInterest = originalAmount * 1.1;

                batch.update(doc.ref, {
                    originalAmount: originalAmount,
                    amount: totalWithInterest,
                    interestRate: 10
                });

                updatedCount++;
            }
        });

        // Commit the batch
        await batch.commit();

        console.log(`Migration complete: Updated ${updatedCount} Standard loan transactions`);

        return NextResponse.json({
            success: true,
            updatedCount
        });
    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to run migration' },
            { status: 500 }
        );
    }
}
