
import {
    addDoc,
    collection,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from './firebase';

export interface AppNotification {
    id?: string;
    userId: string;
    title: string;
    message: string;
    type: 'Loan' | 'Transaction' | 'General';
    status: 'Unread' | 'Read';
    createdAt: any;
    link?: string;
}

export const notificationService = {
    /**
     * Send a notification to a specific user
     */
    async sendNotification(userId: string, title: string, message: string, type: 'Loan' | 'Transaction' | 'General' = 'General', link?: string) {
        await addDoc(collection(db, 'notifications'), {
            userId,
            title,
            message,
            type,
            status: 'Unread',
            createdAt: serverTimestamp(),
            link: link || ''
        });
    },

    /**
     * Notify all admins
     */
    async notifyAdmins(title: string, message: string, type: 'Loan' | 'Transaction' | 'General' = 'General', link?: string) {
        const adminsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'Admin'),
            where('status', '==', 'Active')
        );
        const adminSnapshot = await getDocs(adminsQuery);
        const adminIds = adminSnapshot.docs.map(d => d.id);

        await Promise.all(adminIds.map(adminId =>
            this.sendNotification(adminId, title, message, type, link)
        ));
    },

    /**
     * Get user's notifications
     */
    subscribeToNotifications(userId: string, callback: (notifications: AppNotification[]) => void) {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
            callback(notifications);
        });
    },

    /**
     * Mark as read
     */
    async markAsRead(notificationId: string) {
        await updateDoc(doc(db, 'notifications', notificationId), {
            status: 'Read'
        });
    }
};
