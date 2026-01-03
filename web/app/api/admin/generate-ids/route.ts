import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

const MEMBER_ID_PREFIX = 'SBK';

export async function POST() {
    try {
        // Get all users
        const usersSnapshot = await adminDb.collection('users').get();
        const users = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as any));

        // Sort by creation date
        const sortedUsers = users.sort((a, b) => {
            const dateA = a.createdAt || '9999-12-31';
            const dateB = b.createdAt || '9999-12-31';
            return dateA > dateB ? 1 : -1;
        });

        const existingIds = new Set<string>();
        users.forEach(u => {
            if (u.memberId) existingIds.add(u.memberId);
        });

        let count = 0;
        let memberNumber = 1;
        const errors: string[] = [];

        const batch = adminDb.batch();

        for (const user of sortedUsers) {
            if (user.memberId) continue;

            // Find next available number
            while (existingIds.has(generateMemberId(memberNumber))) {
                memberNumber++;
            }

            const memberId = generateMemberId(memberNumber);
            const userRef = adminDb.collection('users').doc(user.id);

            batch.update(userRef, {
                memberId: memberId,
                updatedAt: new Date().toISOString()
            });

            existingIds.add(memberId);
            count++;
            memberNumber++;
        }

        if (count > 0) {
            await batch.commit();
        }

        return NextResponse.json({ success: true, count, errors });
    } catch (error: any) {
        console.error('API Error generating IDs:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

function generateMemberId(num: number): string {
    const paddedNum = num.toString().padStart(3, '0');
    return `${MEMBER_ID_PREFIX}${paddedNum}`;
}
