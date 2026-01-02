import { sendLoanReminder } from '@/lib/emailService';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Firebase Admin (lazy load)
function initFirebaseAdmin() {
    if (!admin.apps.length) {
        if (!process.env.FIREBASE_PRIVATE_KEY) {
            console.warn('Missing FIREBASE_PRIVATE_KEY, skipping Admin init');
            return null;
        }

        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                }),
            });
        } catch (error) {
            console.error('Firebase Admin initialization error:', error);
        }
    }
    return admin;
}

/**
 * POST /api/email/send-loan-reminders
 * Sends loan repayment reminders to users with outstanding loans
 * 
 * Authentication: Requires Bearer token with valid admin user
 */
export async function POST(request: NextRequest) {
    const app = initFirebaseAdmin();
    if (!app) {
        return NextResponse.json(
            { error: 'Server misconfiguration: Missing Firebase Credentials' },
            { status: 500 }
        );
    }

    // Verify Firebase Auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    try {
        // Verify the token and check user is an admin
        const decodedToken = await app.auth().verifyIdToken(token);
        const db = app.firestore();

        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        const userData = userDoc.data();

        // Only admins can trigger reminder sends
        if (userData?.role !== 'Admin') {
            return NextResponse.json(
                { error: 'Only admins can send reminder emails' },
                { status: 403 }
            );
        }

        // Fetch all transactions to calculate loan balances
        const transactionsSnapshot = await db.collection('transactions').get();
        const transactions: any[] = [];

        transactionsSnapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
            transactions.push(doc.data());
        });

        // Get all users
        const usersSnapshot = await db.collection('users').get();
        const usersMap: { [key: string]: any } = {};

        usersSnapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
            const data = doc.data();
            if (data.status === 'Active') {
                usersMap[doc.id] = data;
            }
        });

        // Calculate outstanding loans for each member
        const membersWithLoans: Array<{
            userId: string;
            email: string;
            name: string;
            loans: Array<{ type: string; amount: number; balance: number }>;
        }> = [];

        // Group transactions by member
        const memberTransactions: { [key: string]: any[] } = {};
        transactions.forEach(tx => {
            const memberId = tx.memberId;
            if (!memberTransactions[memberId]) {
                memberTransactions[memberId] = [];
            }
            memberTransactions[memberId].push(tx);
        });

        // Calculate loan balances for each member
        Object.entries(memberTransactions).forEach(([memberId, txs]: [string, any[]]) => {
            // Group by loan type (Standard, Dharura)
            const loansByType: { [key: string]: { borrowed: number; repaid: number; originalAmount: number } } = {};

            txs.forEach(tx => {
                if (tx.type === 'Loan') {
                    const loanType = tx.category; // 'Standard' or 'Dharura'
                    if (!loansByType[loanType]) {
                        loansByType[loanType] = { borrowed: 0, repaid: 0, originalAmount: 0 };
                    }
                    loansByType[loanType].borrowed += tx.amount;
                    loansByType[loanType].originalAmount = tx.amount; // Most recent loan amount
                } else if (tx.type === 'Loan Repayment') {
                    const loanType = tx.category; // 'Standard' or 'Dharura'
                    if (!loansByType[loanType]) {
                        loansByType[loanType] = { borrowed: 0, repaid: 0, originalAmount: 0 };
                    }
                    loansByType[loanType].repaid += tx.amount;
                }
            });

            // Build loans array with outstanding balances
            const loans: Array<{ type: string; amount: number; balance: number }> = [];
            Object.entries(loansByType).forEach(([loanType, data]) => {
                const balance = data.borrowed - data.repaid;
                if (balance > 0) {
                    loans.push({
                        type: loanType,
                        amount: data.originalAmount,
                        balance: balance,
                    });
                }
            });

            // Only add to list if user has outstanding loans
            if (loans.length > 0 && usersMap[memberId]) {
                const user = usersMap[memberId];
                if (user.email) {
                    membersWithLoans.push({
                        userId: memberId,
                        email: user.email,
                        name: user.displayName || 'Member',
                        loans: loans,
                    });
                }
            }
        });

        if (membersWithLoans.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No members with outstanding loans found',
                recipientCount: 0,
            });
        }

        console.log(`Sending loan reminders to ${membersWithLoans.length} members with outstanding loans...`);

        // Send individual emails to each member with outstanding loans
        const emailResults = await Promise.allSettled(
            membersWithLoans.map(member => sendLoanReminder(member.email, member.name, member.loans))
        );

        const successCount = emailResults.filter(result => result.status === 'fulfilled' && result.value).length;
        const failureCount = emailResults.filter(result => result.status === 'rejected' || !result.value).length;

        console.log(`Loan reminder results: ${successCount} succeeded, ${failureCount} failed`);

        return NextResponse.json({
            success: failureCount === 0,
            message: `Loan reminders sent to ${successCount}/${membersWithLoans.length} members`,
            successCount,
            failureCount,
            recipientCount: membersWithLoans.length,
        });
    } catch (error: any) {
        console.error('Error sending loan reminders:', error);

        if (error.code === 'auth/invalid-id-token' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
        }

        return NextResponse.json(
            { error: 'Failed to send loan reminders', details: error.message },
            { status: 500 }
        );
    }
}
