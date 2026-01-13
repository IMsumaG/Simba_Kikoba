import * as fs from 'fs';
import * as path from 'path';

// Load env vars manually
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2 && !line.startsWith('#')) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim().replace(/(^"|"$)/g, '');
                process.env[key] = value;
            }
        });
        console.log('Loaded .env.local');
    }
} catch (e) {
    console.warn('Failed to load .env.local', e);
}

// import { adminDb } from '../lib/firebase-admin'; // Dynamic import instead

// Initialize app if not already (it might be by the import, but safe to check)
// Note: We need to ensure environment variables are loaded if running this standalone.
// In a Next.js environment scripts usually need careful env handling.
// For this script, we assume the user runs it with `dotenv` or similar if needed, 
// OR we hardcode/mock for safety if we can't access prod DB easily.
// BUT the request implies we should test on the real DB (or dev DB).
// Let's assume we can use the existing setup.

async function verifyPenalties() {
    console.log('Starting Penalty Verification...');

    // Dynamically import after Env loading
    const admin = await import('firebase-admin');
    const { adminDb } = await import('../lib/firebase-admin');

    // 1. Create Test User
    const testUserId = 'test_penalty_user_' + Date.now();
    await adminDb.collection('users').doc(testUserId).set({
        uid: testUserId,
        displayName: 'Test Penalty User',
        email: `test_${testUserId}@example.com`,
        role: 'Member',
        status: 'Active',
        createdAt: new Date().toISOString()
    });
    console.log(`Created test user: ${testUserId}`);

    // 2. Create Test Loans
    const loans = [
        {
            // Loan A: Dharura, > 30 days old (Should get penalty)
            type: 'Loan',
            category: 'Dharura',
            amount: 100000,
            date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 days ago
            status: 'Completed',
            memberId: testUserId,
            memberName: 'Test User',
            description: 'Overdue Dharura'
        },
        {
            // Loan B: Dharura, < 30 days old (Should NOT get penalty)
            type: 'Loan',
            category: 'Dharura',
            amount: 50000,
            date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
            status: 'Completed',
            memberId: testUserId,
            memberName: 'Test User',
            description: 'Recent Dharura'
        },
        {
            // Loan C: Standard, > 30 days old (Should NOT get penalty)
            type: 'Loan',
            category: 'Standard',
            amount: 200000,
            date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 days ago
            status: 'Completed',
            memberId: testUserId,
            memberName: 'Test User',
            description: 'Overdue Standard'
        }
    ];

    const loanRefs = [];
    for (const loan of loans) {
        const ref = await adminDb.collection('transactions').add(loan);
        loanRefs.push({ id: ref.id, ...loan });
    }
    console.log('Created 3 test loans.');

    // 3. Run Verification Logic (Simulate Cron)
    console.log('Running penalty check logic...');

    // We'll mimic the request logic from route.ts here 
    // to verify it works against these specific docs
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = new Date();

    const snapshot = await adminDb.collection('transactions')
        .where('memberId', '==', testUserId) // Filter by our test user to be safe
        .where('type', '==', 'Loan')
        .where('category', '==', 'Dharura')
        .where('status', '==', 'Completed')
        .get();

    let penaltiesApplied = 0;

    const updates: Promise<any>[] = [];

    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.penaltyApplied) return;

        const issueDate = new Date(data.date);
        const diffTime = now.getTime() - issueDate.getTime();

        if (diffTime > THIRTY_DAYS_MS) {
            console.log(`Applying penalty to loan ${doc.id} (Age: ${Math.floor(diffTime / (24 * 60 * 60 * 1000))} days)`);
            updates.push(doc.ref.update({
                amount: data.amount + 60000,
                penaltyApplied: true,
                penaltyDate: now.toISOString()
            }));
            penaltiesApplied++;
        }
    });

    await Promise.all(updates);
    console.log(`Applied penalties to ${penaltiesApplied} loans.`);

    // 4. Verify Results
    console.log('Verifying results...');

    // Check Loan A
    const loanA = await adminDb.collection('transactions').doc(loanRefs[0].id).get();
    const dataA = loanA.data();
    if (dataA?.penaltyApplied && dataA?.amount === 160000) {
        console.log('✅ Loan A (Overdue Dharura): Penalty Applied Correctly (100k -> 160k)');
    } else {
        console.error('❌ Loan A Failed', dataA);
    }

    // Check Loan B
    const loanB = await adminDb.collection('transactions').doc(loanRefs[1].id).get();
    const dataB = loanB.data();
    if (!dataB?.penaltyApplied && dataB?.amount === 50000) {
        console.log('✅ Loan B (Recent Dharura): No Penalty Applied Correctly');
    } else {
        console.error('❌ Loan B Failed', dataB);
    }

    // Check Loan C (Need to query separately as we filtered by Dharura above, 
    // but the Cron logic filters by Dharura too, so this proves the filter works 
    // because it wasn't even fetched/processed)
    const loanC = await adminDb.collection('transactions').doc(loanRefs[2].id).get();
    const dataC = loanC.data();
    if (!dataC?.penaltyApplied && dataC?.amount === 200000) {
        console.log('✅ Loan C (Overdue Standard): No Penalty Applied Correctly');
    } else {
        console.error('❌ Loan C Failed', dataC);
    }

    // 5. Cleanup
    console.log('Cleaning up test data...');
    await adminDb.collection('users').doc(testUserId).delete();
    for (const loan of loanRefs) {
        await adminDb.collection('transactions').doc(loan.id).delete();
    }
    console.log('Cleanup complete.');
}

verifyPenalties().catch(console.error);
