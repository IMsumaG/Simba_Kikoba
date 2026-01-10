/**
 * Global TypeScript Type Definitions
 * Centralized types for consistent typing across the app
 */

/**
 * User Profile - Stored in Firestore 'users' collection
 */
export interface UserProfile {
    uid: string;
    memberId?: string; // Format: SBK001, SBK002, etc.
    displayName: string;
    email: string;
    role: 'Admin' | 'Member';
    groupCode?: string;
    status: 'Active' | 'Inactive' | 'Pending';
    createdAt: string;
    updatedAt?: string;
}

/**
 * Transaction Record
 */
export interface Transaction {
    id?: string;
    type: 'Contribution' | 'Loan' | 'Loan Repayment';
    category?: 'Hisa' | 'Jamii' | 'Standard' | 'Dharura' | null;
    interestRate?: number | null;
    amount: number; // Total amount (includes interest for Standard loans)
    originalAmount?: number | null; // Principal amount before interest (for loans)
    memberId: string;
    memberName: string;
    date: string;
    createdBy: string;
    status: 'Completed' | 'Pending';
    createdAt?: string;
}

/**
 * Group Code - Stored in Firestore 'groupCodes' collection
 */
export interface GroupCode {
    code: string;
    isActive: boolean;
    createdAt: string;
    expiresAt?: string;
    maxRedemptions: number;
    redeemedCount: number;
    description?: string;
}

/**
 * Member Statistics
 */
export interface MemberStats {
    totalContributions: number;
    totalLoans: number;
    totalRepayments: number;
    outstandingBalance: number;
}

/**
 * Hisa (Shares) Data
 */
export interface HisaData {
    totalHisa: number;
    contribution?: number;
    dividends?: number;
}

/**
 * Loan Details
 */
export interface LoanDetails {
    totalLoaned: number;
    totalRepayments: number;
    totalWithInterest: number;
    remainingBalance: number;
    outstandingLoans: number;
}

/**
 * Monthly Report
 */
export interface MonthlyReport {
    memberId: string;
    memberName: string;
    memberEmail: string;
    month: number;
    year: number;
    hisa: HisaData;
    jamii: number;
    standardLoan: LoanDetails;
    dharuraLoan: LoanDetails;
    reportDate: string;
}

/**
 * Group Monthly Report
 */
export interface GroupMonthlyReport {
    month: number;
    year: number;
    totalMembers: number;
    members: MonthlyReport[];
    totalHisa: number;
    totalJamii: number;
    totalStandardLoans: number;
    totalDharuraLoans: number;
    totalContributions: number;
    reportDate: string;
}

/**
 * Dashboard Totals
 */
export interface DashboardTotals {
    vaultBalance: number;
    loanPool: number;
    activeLoans: number;
    totalMembers: number;
}

/**
 * Error Response
 */
export interface ErrorResponse {
    code?: string;
    message: string;
    details?: unknown;
}

/**
 * API Response Wrapper
 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ErrorResponse;
}

/**
 * Menu Item Props - for Profile screen
 */
export interface MenuItemProps {
    icon: string;
    title: string;
    value?: string;
    onPress?: () => void;
    color?: string;
    isLast?: boolean;
}

/**
 * Stat Card Props - for Dashboard
 */
export interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ size: number; color: string }>;
    color: string;
}

/**
 * Form Validation Result
 */
export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Auth Context Type
 */
export interface AuthContextType {
    user: any; // Firebase User type
    role: 'Admin' | 'Member' | null;
    loading: boolean;
    groupCode?: string;
}

/**
 * Firestore Query Options
 */
export interface QueryOptions {
    limit?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    where?: Array<{
        field: string;
        operator: '==' | '<' | '>' | '<=' | '>=' | '!=';
        value: any;
    }>;
}

/**
 * Hisa Contribution Record
 */
export interface HisaContribution {
    id?: string;
    memberId: string;
    amount: number;
    date: string;
    description?: string;
}

/**
 * Loan Application
 */
export interface LoanApplication {
    id?: string;
    memberId: string;
    type: 'Standard' | 'Dharura';
    amount: number;
    interestRate: number;
    duration: number;
    status: 'Applied' | 'Approved' | 'Rejected' | 'Active' | 'Completed';
    appliedDate: string;
    approvedDate?: string;
    approvedBy?: string;
}

/**
 * Payment Record
 */
export interface PaymentRecord {
    id?: string;
    loanId: string;
    memberId: string;
    amount: number;
    date: string;
    paymentMethod?: 'Cash' | 'Bank Transfer' | 'Mobile Money';
    confirmationNumber?: string;
}

/**
 * Loan Request - For Multi-Admin Approval Workflow
 */
export interface LoanRequest {
    id?: string;
    memberId: string;
    requesterMemberId?: string; // e.g. M001
    memberName: string;
    amount: number;
    type: 'Standard' | 'Dharura';
    status: 'Pending' | 'Approved' | 'Rejected';
    requestedDate: string;
    description?: string;
    // Track each admin's decision: { adminUid: 'approved' | 'rejected' | 'pending' }
    approvals: Record<string, 'approved' | 'rejected' | 'pending'>;
    adminNames: Record<string, string>; // name of the admins at request time (for tracking)
    rejectionReason?: string;
}

/**
 * Bulk Upload Types
 */
export interface BulkUploadRow {
    date: string;
    memberId: string;
    fullName: string;
    hisaAmount: number;
    jamiiAmount: number;
    standardRepayAmount?: number;
    dharuraRepayAmount?: number;
    standardLoanAmount?: number;
    dharuraLoanAmount?: number;
}

export interface BulkUploadValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    validRows: BulkUploadRow[];
    invalidRows: { row: BulkUploadRow; errors: string[] }[];
    duplicateRows: BulkUploadRow[];
    totalAffectedUsers: number;
    totals: {
        hisaAmount: number;
        jamiiAmount: number;
        standardRepayAmount: number;
        dharuraRepayAmount: number;
        standardLoanAmount: number;
        dharuraLoanAmount: number;
    };
}

export interface BulkUploadProcessResult {
    success: boolean;
    totalRows: number;
    successCount: number;
    failedCount: number;
    skippedCount: number;
    details: {
        row: BulkUploadRow;
        status: 'success' | 'failed' | 'skipped';
        message?: string;
    }[];
}
