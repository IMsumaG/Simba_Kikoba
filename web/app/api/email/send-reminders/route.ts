import { sendMonthlyReminder } from '@/lib/emailService';
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
 * POST /api/email/send-reminders
 * Sends monthly reminder emails to all admins
 * 
 * Authentication: Requires Bearer token with valid Kikoba admin ID token
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

        // Only admins can trigger email sends
        if (userData?.role !== 'Admin') {
            return NextResponse.json(
                { error: 'Only admins can send reminder emails' },
                { status: 403 }
            );
        }

        // Fetch all admins
        const adminsSnapshot = await db
            .collection('users')
            .where('role', '==', 'Admin')
            .get();

        const admins: { email: string; name: string }[] = [];
        adminsSnapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
            const data = doc.data();
            if (data.email) {
                admins.push({
                    email: data.email,
                    name: data.displayName || 'Admin',
                });
            }
        });

        if (admins.length === 0) {
            return NextResponse.json({ success: true, message: 'No admins found' });
        }

        // Send emails
        const emailResults = await Promise.allSettled(
            admins.map(admin => sendMonthlyReminder(admin.email, admin.name))
        );

        const successCount = emailResults.filter(result => result.status === 'fulfilled' && result.value).length;
        const failureCount = emailResults.filter(result => result.status === 'rejected' || !result.value).length;

        console.log(`Email sending results: ${successCount} succeeded, ${failureCount} failed`);

        return NextResponse.json({
            success: failureCount === 0,
            message: `Sent reminders to ${successCount}/${admins.length} admins`,
            successCount,
            failureCount,
            adminsCount: admins.length,
        });
    } catch (error: any) {
        console.error('Error sending reminder emails:', error);

        // Check if it's an auth error
        if (error.code === 'auth/invalid-id-token' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
        }

        return NextResponse.json(
            { error: 'Failed to send reminder emails', details: error.message },
            { status: 500 }
        );
    }
}
