import { sendMonthlyReminder } from '@/lib/emailService';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Firebase Admin (lazy load)
function initFirebaseAdmin() {
    if (!admin.apps.length) {
        // Check if we have credentials (skip if building without them)
        if (!process.env.FIREBASE_PRIVATE_KEY) {
            console.warn('Missing FIREBASE_PRIVATE_KEY, skipping Admin init');
            return null;
        }

        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    // Replace escaped newlines for Vercel env compatibility
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                }),
            });
        } catch (error) {
            console.error('Firebase Admin initialization error:', error);
        }
    }
    return admin;
}

export async function GET(request: NextRequest) {
    const app = initFirebaseAdmin();
    if (!app) {
        return NextResponse.json({ error: 'Server misconfiguration: Missing Firebase Credentials' }, { status: 500 });
    }
    const db = app.firestore();
    // CRON_SECRET is used for basic security to ensure only authorized callers trigger this
    const authHeader = request.headers.get('authorization');
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';

    if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('Starting Monthly Reminder Cron Job...');

        // 1. Fetch all users with role 'Admin'
        const adminsSnapshot = await db.collection('users')
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

        console.log(`Found ${admins.length} admins to notify.`);

        if (admins.length === 0) {
            return NextResponse.json({ success: true, message: 'No admins found' });
        }

        // 2. Send emails via Nodemailer
        const emailResults = await Promise.allSettled(
            admins.map(adminUser => sendMonthlyReminder(adminUser.email, adminUser.name))
        );

        const successCount = emailResults.filter(result => result.status === 'fulfilled' && result.value).length;
        const failureCount = emailResults.filter(result => result.status === 'rejected' || !result.value).length;

        console.log(`Email sending results: ${successCount} succeeded, ${failureCount} failed`);

        if (failureCount > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Sent reminders to ${successCount}/${admins.length} admins. ${failureCount} failed.`,
                    successCount,
                    failureCount,
                },
                { status: 207 } // 207 Multi-Status
            );
        }

        return NextResponse.json({
            success: true,
            message: `Successfully sent reminders to ${admins.length} admins.`,
            count: admins.length,
        });
    } catch (error: any) {
        console.error('Cron Job Failed:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
