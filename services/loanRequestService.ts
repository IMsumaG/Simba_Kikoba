import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { LoanRequest } from '../types';
import { activityLogger } from './activityLogger';
import { emailService } from './emailService';
import { db } from './firebase';
import { notificationService } from './notificationService';

/**
 * Service for handling multi-admin loan approval workflow
 */
export const loanRequestService = {
    /**
     * Submit a new loan request
     */
    async submitLoanRequest(uid: string, memberName: string, amount: number, type: 'Standard' | 'Dharura', description?: string) {
        // 1. Get all active admins at this moment using a specific query
        const adminsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'Admin'),
            where('status', '==', 'Active')
        );
        const adminSnapshot = await getDocs(adminsQuery);
        const admins = adminSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any));

        if (admins.length === 0) {
            throw new Error("No active admins found to approve your request.");
        }

        const approvals: Record<string, 'approved' | 'rejected' | 'pending'> = {};
        const adminNames: Record<string, string> = {};

        admins.forEach(admin => {
            approvals[admin.uid] = 'pending';
            adminNames[admin.uid] = admin.displayName;
        });

        // Get user's custom memberId for better searching
        const userDoc = await getDoc(doc(db, 'users', uid));
        const customMemberId = userDoc.exists() ? userDoc.data().memberId : '';

        const newRequest: LoanRequest = {
            memberId: uid,
            requesterMemberId: customMemberId || '', // Store for easier searching
            memberName: memberName,
            amount: amount,
            type: type,
            status: 'Pending',
            requestedDate: new Date().toISOString(),
            description: description || '',
            approvals: approvals,
            adminNames: adminNames
        };

        const docRef = await addDoc(collection(db, 'loan_requests'), {
            ...newRequest,
            createdAt: serverTimestamp()
        });

        // Send notifications to all admins
        await notificationService.notifyAdmins(
            "New Loan Request",
            `${memberName} requested a ${type} loan of ${amount.toLocaleString()} TZS`,
            'Loan'
        );

        // Send email alert to admins
        await emailService.sendLoanRequestAlert(memberName, amount, type);

        return docRef.id;
    },

    /**
     * Get all loan requests (Admin view)
     */
    async getAllRequests(): Promise<LoanRequest[]> {
        const q = query(collection(db, 'loan_requests'), orderBy('requestedDate', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoanRequest));
    },

    /**
     * Get member's own loan requests
     */
    async getMyRequests(uid: string): Promise<LoanRequest[]> {
        const q = query(
            collection(db, 'loan_requests'),
            where('memberId', '==', uid),
            orderBy('requestedDate', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoanRequest));
    },

    /**
     * Admin Approval/Rejection Action
     */
    async castVote(requestId: string, adminUid: string, decision: 'approved' | 'rejected', reason?: string) {
        const requestRef = doc(db, 'loan_requests', requestId);
        const requestSnap = await getDoc(requestRef);

        if (!requestSnap.exists()) throw new Error("Request not found");

        const request = requestSnap.data() as LoanRequest;

        if (request.status !== 'Pending') {
            throw new Error(`This request has already been ${request.status.toLowerCase()}.`);
        }

        // Update this admin's approval status
        const newApprovals = { ...request.approvals, [adminUid]: decision };

        let newStatus: 'Pending' | 'Approved' | 'Rejected' = 'Pending';
        let rejectionReason = request.rejectionReason || '';

        if (decision === 'rejected') {
            newStatus = 'Rejected';
            rejectionReason = reason || 'Rejected by admin';
        } else {
            // Check if ALL admins have approved
            const allApproved = Object.values(newApprovals).every(status => status === 'approved');
            if (allApproved) {
                newStatus = 'Approved';
            }
        }

        // Update Firestore
        await updateDoc(requestRef, {
            approvals: newApprovals,
            status: newStatus,
            rejectionReason: rejectionReason,
            updatedAt: serverTimestamp()
        });

        // Log the activity
        try {
            const adminSnap = await getDoc(doc(db, 'users', adminUid));
            if (adminSnap.exists()) {
                const adminProfile = { uid: adminUid, ...adminSnap.data() } as any;

                // Get the affected member's details
                const memberSnap = await getDoc(doc(db, 'users', request.memberId));
                const memberProfile = memberSnap.exists() ? memberSnap.data() as any : null;
                const memberMemberId = memberProfile?.memberId || request.requesterMemberId || '';

                await activityLogger.logLoanVoted(
                    adminUid,
                    adminProfile,
                    requestId,
                    request.memberName,
                    request.memberId,
                    memberMemberId,
                    request.type,
                    decision,
                    reason
                );
            }
        } catch (logError) {
            console.warn("Failed to log loan vote activity:", logError);
        }

        // Notify member of decision
        if (newStatus === 'Approved') {
            await this.createLoanTransactionFromRequest({ ...request, id: requestId });
            await notificationService.sendNotification(
                request.memberId,
                "Loan Approved! 🎉",
                `Your ${request.type} loan of ${request.amount.toLocaleString()} TZS has been approved by all admins.`,
                'Loan'
            );

            // Send email alert
            await emailService.sendLoanDecisionAlert(request.memberId, "Approved", request.type, request.amount);
        } else if (newStatus === 'Rejected') {
            await notificationService.sendNotification(
                request.memberId,
                "Loan Request Rejected",
                `Your ${request.type} loan request was rejected. Reason: ${rejectionReason}`,
                'Loan'
            );

            // Send email alert
            await emailService.sendLoanDecisionAlert(request.memberId, "Rejected", request.type, request.amount, rejectionReason);
        }

        return newStatus;
    },

    /**
     * Helper to create the actual transaction once approved
     */
    async createLoanTransactionFromRequest(request: LoanRequest) {
        // Calculate interest if Standard
        let finalAmount = request.amount;
        let originalAmount = request.amount;
        let interestRate = 0;

        if (request.type === 'Standard') {
            finalAmount = Math.round(request.amount * 1.1); // 10%
            interestRate = 10;
        }

        const transaction: any = {
            memberId: request.memberId,
            memberName: request.memberName,
            amount: finalAmount,
            originalAmount: originalAmount,
            type: 'Loan',
            category: request.type,
            interestRate: interestRate,
            date: new Date().toISOString(),
            status: 'Completed',
            createdBy: 'System (Loan Approval)',
            requestId: request.id // Link it
        };

        await addDoc(collection(db, 'transactions'), transaction);
    },

    /**
     * Listen for real-time updates (for notifications/UI)
     */
    subscribeToRequests(callback: (requests: LoanRequest[]) => void) {
        const q = query(collection(db, 'loan_requests'), orderBy('requestedDate', 'desc'));
        return onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoanRequest));
            callback(requests);
        });
    }
};
