
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

/**
 * POST /api/email/loan-notification
 * Sends loan-related email notifications
 * 
 * Authentication: Requires Bearer token with valid admin user
 */
export async function POST(request: NextRequest) {
    const app = initFirebaseAdmin();

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized - Missing token' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    try {
        // Verify Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(token);
        const db = admin.firestore();

        // SECURITY: Verify user has Admin role
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists || userDoc.data()?.role !== 'Admin') {
            return NextResponse.json(
                { error: 'Forbidden - Admin access required' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { type, payload } = body;
        // type: 'request' | 'decision'

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

            const memberDoc = await db.collection('users').doc(memberId).get();
            const userData = memberDoc.data();

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

        // Check if it's an auth error
        if (error.code === 'auth/invalid-id-token' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
