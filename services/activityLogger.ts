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
import { ActivityLog, ActivityLogFilter, ActivityStats } from '../types/ActivityLog';
import { db } from './firebase';
import { UserProfile } from './memberService';

/**
 * Activity Logger Service
 * 
 * Handles all audit trail and activity logging functionality.
 * Logs all significant user actions for compliance and accountability.
 */
class ActivityLoggerService {
  private readonly collectionName = 'activityLogs';

  /**
   * Log a user activity
   * 
   * @param activity The activity to log
   * @returns Promise with activity ID
   */
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

  /**
   * Log transaction created activity
   */
  async logTransactionCreated(
    userId: string,
    user: UserProfile,
    transaction: any,
    groupCode: string
  ): Promise<string> {
    return this.logActivity({
      activityType: 'transaction_created',
      userId,
      userEmail: user.email,
      userName: user.displayName || 'Unknown',
      userRole: user.role,
      entityType: 'transaction',
      entityId: transaction.id || 'pending',
      entityName: `${transaction.type} - ${transaction.category}`,
      description: `Created ${transaction.type} transaction of ${transaction.amount} TSh (${transaction.category})`,
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

  /**
   * Log transaction updated activity
   */
  async logTransactionUpdated(
    userId: string,
    user: UserProfile,
    transactionId: string,
    before: any,
    after: any,
    groupCode: string
  ): Promise<string> {
    const changes = this.getChangedFields(before, after);
    return this.logActivity({
      activityType: 'transaction_updated',
      userId,
      userEmail: user.email,
      userName: user.displayName || 'Unknown',
      userRole: user.role,
      entityType: 'transaction',
      entityId: transactionId,
      description: `Updated ${Object.keys(changes).join(', ')}`,
      changes: { before, after },
      metadata: {
        transactionAmount: after.amount,
        affectedMembers: [after.memberId],
      },
      status: 'success',
      groupCode,
      transactionId,
    });
  }

  /**
   * Log member added activity
   */
  async logMemberAdded(
    userId: string,
    user: UserProfile,
    newMember: UserProfile,
    groupCode: string
  ): Promise<string> {
    return this.logActivity({
      activityType: 'member_added',
      userId,
      userEmail: user.email,
      userName: user.displayName || 'Unknown',
      userRole: user.role,
      entityType: 'member',
      entityId: newMember.uid,
      entityName: newMember.displayName,
      description: `Added member ${newMember.displayName} (${newMember.email})`,
      changes: {
        after: newMember,
      },
      metadata: {
        affectedMembers: [newMember.uid],
      },
      status: 'success',
      groupCode,
    });
  }

  /**
   * Log member deleted activity
   */
  async logMemberDeleted(
    userId: string,
    user: UserProfile,
    deletedMember: UserProfile,
    groupCode: string
  ): Promise<string> {
    return this.logActivity({
      activityType: 'member_deleted',
      userId,
      userEmail: user.email,
      userName: user.displayName || 'Unknown',
      userRole: user.role,
      entityType: 'member',
      entityId: deletedMember.uid,
      entityName: deletedMember.displayName,
      description: `Deleted member ${deletedMember.displayName}`,
      changes: {
        before: deletedMember,
      },
      metadata: {
        affectedMembers: [deletedMember.uid],
      },
      status: 'success',
      groupCode,
    });
  }

  /**
   * Log member status change
   */
  async logMemberStatusChanged(
    userId: string,
    user: UserProfile,
    memberId: string,
    memberName: string,
    oldStatus: string,
    newStatus: string,
    groupCode: string
  ): Promise<string> {
    return this.logActivity({
      activityType: 'member_status_changed',
      userId,
      userEmail: user.email,
      userName: user.displayName || 'Unknown',
      userRole: user.role,
      entityType: 'member',
      entityId: memberId,
      entityName: memberName,
      description: `Changed status from ${oldStatus} to ${newStatus}`,
      changes: {
        before: { status: oldStatus },
        after: { status: newStatus },
      },
      metadata: {
        affectedMembers: [memberId],
      },
      status: 'success',
      groupCode,
    });
  }

  /**
   * Log user login
   */
  async logUserLogin(userId: string, user: UserProfile, groupCode: string): Promise<string> {
    return this.logActivity({
      activityType: 'user_login',
      userId,
      userEmail: user.email,
      userName: user.displayName || 'Unknown',
      userRole: user.role,
      entityType: 'user',
      entityId: userId,
      description: `User logged in`,
      changes: {},
      metadata: {
        deviceInfo: 'Mobile App',
      },
      status: 'success',
      groupCode,
    });
  }

  /**
   * Log user logout
   */
  async logUserLogout(userId: string, user: UserProfile, groupCode: string): Promise<string> {
    return this.logActivity({
      activityType: 'user_logout',
      userId,
      userEmail: user.email,
      userName: user.displayName || 'Unknown',
      userRole: user.role,
      entityType: 'user',
      entityId: userId,
      description: `User logged out`,
      changes: {},
      metadata: {
        deviceInfo: 'Mobile App',
      },
      status: 'success',
      groupCode,
    });
  }

  /**
   * Log loan approval or rejection
   */
  async logLoanVoted(
    userId: string,
    user: UserProfile,
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
      userEmail: user.email,
      userName: user.displayName || 'Unknown',
      userRole: user.role,
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
      groupCode: groupCode || user.groupCode || 'DEFAULT',
    });
  }

  /**
   * Log bulk upload activity
   */
  async logBulkUpload(
    userId: string,
    user: UserProfile,
    rowCount: number,
    status: 'success' | 'failed',
    groupCode?: string
  ): Promise<string> {
    return this.logActivity({
      activityType: 'transaction_created', // Using an existing type or we can add 'bulk_upload' to the type if needed
      userId,
      userEmail: user.email,
      userName: user.displayName || 'Unknown',
      userRole: user.role,
      entityType: 'transaction',
      entityId: 'bulk-' + Date.now(),
      description: `Performed bulk upload of ${rowCount} transactions`,
      changes: {
        after: { rowCount },
      },
      metadata: {
        transactionAmount: rowCount, // repurposed
      },
      status,
      groupCode: groupCode || user.groupCode || 'DEFAULT',
    });
  }

  /**
   * Log failed activity (error occurred)
   */
  async logFailedActivity(
    activityType: ActivityLog['activityType'],
    userId: string,
    user: UserProfile,
    entityType: ActivityLog['entityType'],
    entityId: string,
    error: any,
    groupCode: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    return this.logActivity({
      activityType,
      userId,
      userEmail: user.email,
      userName: user.displayName || 'Unknown',
      userRole: user.role,
      entityType,
      entityId,
      description: `Failed to perform action: ${error.message}`,
      changes: {},
      metadata: metadata || {},
      status: 'failed',
      failureReason: error.message,
      groupCode,
    });
  }

  /**
   * Get activity logs with filters
   */
  async getActivityLogs(filter: ActivityLogFilter & { groupCode: string }): Promise<ActivityLog[]> {
    try {
      // Build constraints array - order matters: where clauses first, then orderBy, then limit
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

      // Add orderBy after all where clauses
      constraints.push(orderBy('createdAt', 'desc'));

      // Add limit last
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

  /**
   * Get activity logs by date range
   */
  async getActivityLogsByDateRange(
    groupCode: string,
    startDate: Date,
    endDate: Date,
    limitCount?: number
  ): Promise<ActivityLog[]> {
    try {
      const constraints: any[] = [
        where('groupCode', '==', groupCode),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('createdAt', 'desc'),
      ];

      if (limitCount) {
        constraints.push(limit(limitCount));
      }

      const q = query(collection(db, this.collectionName), ...constraints);
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ActivityLog[];
    } catch (error) {
      console.error('Error fetching activity logs by date range:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(groupCode: string): Promise<ActivityStats> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('groupCode', '==', groupCode)
      );
      const snapshot = await getDocs(q);
      const activities = snapshot.docs.map((doc) => doc.data()) as ActivityLog[];

      const stats: ActivityStats = {
        totalActivities: activities.length,
        activitiesByType: {},
        activitiesByUser: {},
        successRate: 0,
        failedCount: 0,
      };

      activities.forEach((activity) => {
        // Count by type
        stats.activitiesByType[activity.activityType] =
          (stats.activitiesByType[activity.activityType] || 0) + 1;

        // Count by user
        stats.activitiesByUser[activity.userId] =
          (stats.activitiesByUser[activity.userId] || 0) + 1;

        // Count failures
        if (activity.status === 'failed') {
          stats.failedCount += 1;
        }
      });

      // Calculate success rate
      stats.successRate =
        activities.length > 0
          ? ((activities.length - stats.failedCount) / activities.length) * 100
          : 100;

      return stats;
    } catch (error) {
      console.error('Error calculating activity stats:', error);
      throw error;
    }
  }

  /**
   * Helper: Get changed fields between two objects
   */
  private getChangedFields(before: Record<string, any>, after: Record<string, any>): Record<string, any> {
    const changes: Record<string, any> = {};

    for (const key in after) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changes[key] = { before: before[key], after: after[key] };
      }
    }

    return changes;
  }
}

export const activityLogger = new ActivityLoggerService();
