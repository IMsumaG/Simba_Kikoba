import { Timestamp } from 'firebase/firestore';

/**
 * Activity Log Entry
 * Records all user actions for audit trail and compliance
 */
export interface ActivityLog {
  /** Unique activity ID */
  id: string;

  /** Type of activity (transaction, member_added, status_changed, etc) */
  activityType: 'transaction_created' | 'transaction_updated' | 'transaction_deleted' |
  'member_added' | 'member_deleted' | 'member_status_changed' |
  'user_login' | 'user_logout' | 'settings_changed' | 'report_generated' |
  'loan_approved' | 'loan_rejected' | 'payment_recorded' | 'loan_penalty_applied';

  /** User who performed the action */
  userId: string;
  userEmail: string;
  userName: string;
  userRole: 'Member' | 'Admin';

  /** Member/Admin who performed the action (custom member ID like SBK001) */
  adminMemberId?: string;

  /** Affected entity details */
  entityType: 'transaction' | 'member' | 'loan' | 'user' | 'group' | 'report';
  entityId: string;
  entityName?: string;
  affectedMemberId?: string; // Member ID of the person affected by the action (e.g., SBK001)

  /** Action description for UI */
  description: string;

  /** Change details (before/after values) */
  changes: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };

  /** Reason for the action (especially for loan approvals/rejections) */
  reason?: string;

  /** Additional context */
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    deviceInfo?: string;
    transactionAmount?: number;
    transactionType?: string;
    subTransactionType?: string; // Category like 'Standard', 'Dharura', 'Hisa', 'Jamii'
    affectedMembers?: string[];
    loanType?: string; // e.g., 'Standard' or 'Dharura'
    bulkUpload?: boolean;
    bulkTotalAffectedUsers?: number;
    bulkHisaAmount?: number;
    bulkJamiiAmount?: number;
    bulkStandardRepayAmount?: number;
    bulkDharuraRepayAmount?: number;
    bulkStandardLoanAmount?: number;
    bulkDharuraLoanAmount?: number;
    detailTransactionType?: string; // e.g., 'Bulk Upload Transaction'
    penaltyAmount?: number;
    platform?: string;
    loanId?: string;
  };

  /** Status of action */
  status: 'success' | 'failed' | 'pending';
  failureReason?: string;

  /** Timestamps */
  createdAt: Timestamp;
  createdAtISO: string;

  /** Related transaction (if applicable) */
  transactionId?: string;

  /** Group/Organization (for multi-tenant support) */
  groupCode: string;
}

/**
 * Activity Log Statistics
 */
export interface ActivityStats {
  totalActivities: number;
  activitiesByType: Record<string, number>;
  activitiesByUser: Record<string, number>;
  successRate: number;
  failedCount: number;
}

/**
 * Activity Log Filter Options
 */
export interface ActivityLogFilter {
  userId?: string;
  activityType?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'success' | 'failed' | 'pending';
  searchText?: string;
  limit?: number;
  offset?: number;
}
