import {
    addDoc,
    collection,
    getDocs,
    limit,
    orderBy,
    query,
    Timestamp,
    where,
} from 'firebase/firestore';
import { ActivityLog, ActivityLogFilter } from '../../types/ActivityLog';
import { db } from './firebase';

/**
 * Activity Logger Service (Web Version)
 */
class ActivityLoggerService {
    private readonly collectionName = 'activityLogs';

    async logActivity(activity: Omit<ActivityLog, 'id' | 'createdAt' | 'createdAtISO'>): Promise<string> {
        try {
            const now = new Date();
            const docRef = await addDoc(collection(db, this.collectionName), {
                ...activity,
                createdAt: Timestamp.now(),
                createdAtISO: now.toISOString(),
            });
            return docRef.id;
        } catch (error) {
            console.error('Error logging activity:', error);
            throw error;
        }
    }

    async logTransactionCreated(
        userId: string,
        userName: string,
        transaction: any,
        groupCode: string
    ): Promise<string> {
        return this.logActivity({
            activityType: 'transaction_created',
            userId,
            userEmail: '', // Optional in this context or fetch if available
            userName: userName || 'Unknown',
            userRole: 'Admin',
            entityType: 'transaction',
            entityId: transaction.id || 'pending',
            entityName: `${transaction.type} - ${transaction.category}`,
            description: `Created ${transaction.type} transaction of ${transaction.amount} TSh (${transaction.category}) for ${transaction.memberName}`,
            changes: {
                after: transaction,
            },
            metadata: {
                transactionAmount: transaction.amount,
                transactionType: transaction.type,
                affectedMembers: [transaction.memberId],
            },
            status: 'success',
            groupCode,
            transactionId: transaction.id,
        });
    }

    async logLoanVoted(
        userId: string,
        userName: string,
        requestId: string,
        memberName: string,
        action: 'approved' | 'rejected',
        reason?: string,
        groupCode?: string
    ): Promise<string> {
        const activityType = action === 'approved' ? 'loan_approved' : 'loan_rejected';
        return this.logActivity({
            activityType,
            userId,
            userEmail: '',
            userName: userName || 'Unknown',
            userRole: 'Admin',
            entityType: 'loan',
            entityId: requestId,
            entityName: memberName,
            description: `${action === 'approved' ? 'Approved' : 'Rejected'} loan request for ${memberName}${reason ? `. Reason: ${reason}` : ''}`,
            changes: {
                after: { status: action === 'approved' ? 'Approved' : 'Rejected', reason },
            },
            metadata: {
                affectedMembers: [memberName],
            },
            status: 'success',
            groupCode: groupCode || 'DEFAULT',
        });
    }

    async logBulkUpload(
        userId: string,
        userName: string,
        rowCount: number,
        status: 'success' | 'failed',
        groupCode?: string
    ): Promise<string> {
        return this.logActivity({
            activityType: 'transaction_created',
            userId,
            userEmail: '',
            userName: userName || 'Unknown',
            userRole: 'Admin',
            entityType: 'transaction',
            entityId: 'bulk-' + Date.now(),
            description: `Performed bulk upload of ${rowCount} transactions`,
            changes: {
                after: { rowCount },
            },
            metadata: {
                transactionAmount: rowCount,
            },
            status,
            groupCode: groupCode || 'DEFAULT',
        });
    }

    async getActivityLogs(filter: ActivityLogFilter & { groupCode: string }): Promise<ActivityLog[]> {
        try {
            const constraints: any[] = [where('groupCode', '==', filter.groupCode)];

            if (filter.userId) {
                constraints.push(where('userId', '==', filter.userId));
            }

            if (filter.activityType) {
                constraints.push(where('activityType', '==', filter.activityType));
            }

            if (filter.status) {
                constraints.push(where('status', '==', filter.status));
            }

            constraints.push(orderBy('createdAt', 'desc'));

            if (filter.limit) {
                constraints.push(limit(filter.limit));
            }

            const q = query(collection(db, this.collectionName), ...constraints);
            const snapshot = await getDocs(q);

            return snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as ActivityLog[];
        } catch (error) {
            console.error('Error fetching activity logs:', error);
            throw error;
        }
    }
}

export const activityLogger = new ActivityLoggerService();
