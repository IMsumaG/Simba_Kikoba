import { collection, doc, getDocs, query, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

interface UserProfile {
    memberId?: string;
    displayName?: string;
    createdAt?: string;
}

export const generateMemberId = (number: number): string => {
    return `SBK${number.toString().padStart(3, '0')}`;
};

export const generateMemberIds = async (): Promise<{ success: boolean; count: number; errors: string[] }> => {
    try {
        // Get all users ordered by creation date
        // Get all users (orderBy in query excludes docs without the field)
        const usersQuery = query(collection(db, 'users'));
        const snapshot = await getDocs(usersQuery);

        // Sort in memory to handle missing createdAt
        const sortedDocs = snapshot.docs.sort((a, b) => {
            const dateA = a.data().createdAt || '9999-12-31'; // Push to end if missing
            const dateB = b.data().createdAt || '9999-12-31';
            return dateA > dateB ? 1 : -1;
        });

        const errors: string[] = [];
        let count = 0;

        // First pass: Find existing IDs to avoid duplicates
        const existingIds = new Set<string>();
        sortedDocs.forEach(doc => {
            const data = doc.data();
            if (data.memberId) existingIds.add(data.memberId);
        });

        console.log(`Found ${sortedDocs.length} users in 'users' collection.`);

        let memberNumber = 1;

        for (const userDoc of sortedDocs) {
            const userData = userDoc.data() as UserProfile;
            console.log(`Processing user: ${userData.displayName || 'Unknown'} (${userDoc.id})`);
            console.log(`Current MemberID value:`, userData.memberId);

            // Skip if already has a member ID
            if (userData.memberId) {
                console.log(`Skipping ${userData.displayName || 'Unknown user'}: Already has ID '${userData.memberId}'`);
                continue;
            }

            // Find next available number
            while (existingIds.has(generateMemberId(memberNumber))) {
                memberNumber++;
            }

            try {
                const memberId = generateMemberId(memberNumber);
                console.log(`Assigning ID ${memberId} to ${userData.displayName || 'Unknown user'}`);
                await updateDoc(doc(db, 'users', userDoc.id), {
                    memberId: memberId,
                    updatedAt: new Date().toISOString()
                });
                existingIds.add(memberId);
                count++;
                memberNumber++;
            } catch (error: any) {
                console.error(`Error updating ${userData.displayName || 'Unknown user'}:`, error);
                errors.push(`Failed to update ${userData.displayName || 'Unknown user'}: ${error.message}`);
            }
        }

        return { success: true, count, errors };
    } catch (error: any) {
        return { success: false, count: 0, errors: [error.message] };
    }
};
