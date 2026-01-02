import { sendContributionReminder } from '@/lib/emailService';
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
 * POST /api/email/send-contribution-reminders
 * Sends contribution reminder emails to all members and admins with BCC
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

        // Fetch all users (members and admins)
        const usersSnapshot = await db.collection('users').get();

        const users: { email: string; name: string }[] = [];
        usersSnapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
            const data = doc.data();
            if (data.email && data.status === 'Active') {
                users.push({
                    email: data.email,
                    name: data.displayName || 'Member',
                });
            }
        });

        if (users.length === 0) {
            return NextResponse.json({ success: true, message: 'No active users found' });
        }

        console.log(`Sending contribution reminders to ${users.length} users via BCC...`);

        // Extract emails and names
        const emailList = users.map(u => u.email);
        const namesList = users.map(u => u.name);

        // Send single email with all recipients in BCC
        await sendContributionReminder(emailList, namesList);

        console.log(`✅ Contribution reminder sent via BCC to ${users.length} users`);

        return NextResponse.json({
            success: true,
            message: `Contribution reminder sent to ${users.length} users`,
            recipientCount: users.length,
        });
    } catch (error: any) {
        console.error('Error sending contribution reminders:', error);

        if (error.code === 'auth/invalid-id-token' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
        }

        return NextResponse.json(
            { error: 'Failed to send contribution reminders', details: error.message },
            { status: 500 }
        );
    }
}
