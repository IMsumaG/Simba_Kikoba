import { collection, doc, getDocs, query, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from './memberService';

const MEMBER_ID_PREFIX = 'SBK';

/**
 * Generate member IDs for all users based on sign-up order
 * Format: SBK001, SBK002, SBK003, etc.
 */
export const generateMemberIds = async (): Promise<{ success: boolean; count: number; errors: string[] }> => {
    try {
        // Get all users (orderBy in query excludes docs without the field)
        const usersQuery = query(collection(db, 'users'));
        const snapshot = await getDocs(usersQuery);

        // Sort in memory to handle missing createdAt
        const sortedDocs = snapshot.docs.sort((a, b) => {
            const dataA = a.data() as UserProfile;
            const dataB = b.data() as UserProfile;
            const dateA = dataA.createdAt || '9999-12-31';
            const dateB = dataB.createdAt || '9999-12-31';
            return dateA > dateB ? 1 : -1;
        });

        const errors: string[] = [];
        let count = 0;

        // First pass: Find existing IDs to avoid duplicates
        const existingIds = new Set<string>();
        snapshot.docs.forEach(doc => {
            const data = doc.data() as UserProfile;
            if (data.memberId) existingIds.add(data.memberId);
        });

        let memberNumber = 1;

        for (const userDoc of sortedDocs) {
            const userData = userDoc.data() as UserProfile;

            // Skip if already has a member ID
            if (userData.memberId) {
                continue;
            }

            // Find next available number
            while (existingIds.has(generateMemberId(memberNumber))) {
                memberNumber++;
            }

            try {
                const memberId = generateMemberId(memberNumber);
                await updateDoc(doc(db, 'users', userDoc.id), {
                    memberId: memberId,
                    updatedAt: new Date().toISOString()
                });
                existingIds.add(memberId);
                count++;
                memberNumber++;
            } catch (error: any) {
                errors.push(`Failed to update ${userData.displayName}: ${error.message}`);
            }
        }

        return { success: true, count, errors };
    } catch (error: any) {
        return { success: false, count: 0, errors: [error.message] };
    }
};

/**
 * Generate a member ID from a number
 * @param num - Sequential number
 * @returns Formatted member ID (e.g., SBK001)
 */
export const generateMemberId = (num: number): string => {
    const paddedNum = num.toString().padStart(3, '0');
    return `${MEMBER_ID_PREFIX}${paddedNum}`;
};

/**
 * Get the next available member ID
 */
export const getNextMemberId = async (): Promise<string> => {
    try {
        const snapshot = await getDocs(collection(db, 'users'));

        // Find highest member ID number
        let maxNumber = 0;
        snapshot.forEach((doc) => {
            const data = doc.data() as UserProfile;
            if (data.memberId && data.memberId.startsWith(MEMBER_ID_PREFIX)) {
                const numStr = data.memberId.replace(MEMBER_ID_PREFIX, '');
                const num = parseInt(numStr, 10);
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
        });

        return generateMemberId(maxNumber + 1);
    } catch (error) {
        console.error('Error getting next member ID:', error);
        return generateMemberId(1);
    }
};

/**
 * Find user by member ID
 */
export const findUserByMemberId = async (memberId: string): Promise<UserProfile | null> => {
    try {
        const snapshot = await getDocs(collection(db, 'users'));
        const userDoc = snapshot.docs.find(doc => {
            const data = doc.data() as UserProfile;
            return data.memberId === memberId;
        });

        if (userDoc) {
            return { uid: userDoc.id, ...userDoc.data() } as UserProfile;
        }
        return null;
    } catch (error) {
        console.error('Error finding user by member ID:', error);
        return null;
    }
};
