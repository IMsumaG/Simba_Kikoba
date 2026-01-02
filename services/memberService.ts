import { collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '../types';
import { db } from './firebase';

// Re-export types for backwards compatibility
export type { UserProfile };

export const memberService = {
    // Get all users from Firestore
    async getAllUsers(): Promise<UserProfile[]> {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const users: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
            users.push(doc.data() as UserProfile);
        });
        return users;
    },

    // Update member status
    async updateMemberStatus(uid: string, status: string) {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { status });
    },

    // Delete a member
    async deleteMember(uid: string) {
        await deleteDoc(doc(db, 'users', uid));
    }
};
