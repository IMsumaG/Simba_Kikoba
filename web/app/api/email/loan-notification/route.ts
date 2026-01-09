
import { sendLoanDecisionNotification, sendLoanRequestNotification } from '@/lib/emailService';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

function initFirebaseAdmin() {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    }
    return admin;
}

export async function POST(request: NextRequest) {
    initFirebaseAdmin();
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { type, payload } = body;
        // type: 'request' | 'decision'

        const db = admin.firestore();

        if (type === 'request') {
            const { memberName, amount, loanType } = payload;

            // Get all admin emails
            const adminsSnap = await db.collection('users').where('role', '==', 'Admin').get();
            const adminEmails = adminsSnap.docs.map(d => d.data().email).filter(Boolean);

            if (adminEmails.length > 0) {
                await sendLoanRequestNotification(adminEmails, memberName, amount, loanType);
            }
        } else if (type === 'decision') {
            const { memberId, status, loanType, amount, reason } = payload;

            const userDoc = await db.collection('users').doc(memberId).get();
            const userData = userDoc.data();

            if (userData?.email) {
                await sendLoanDecisionNotification(
                    userData.email,
                    userData.displayName || 'Member',
                    status,
                    loanType,
                    amount,
                    reason
                );
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Email API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
