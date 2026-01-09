import { getAuth } from 'firebase/auth';

// DEPRECATED: EmailJS configuration moved to backend
// The mobile app now calls the backend API endpoint instead
// All email sending is handled by the Next.js backend using Nodemailer

/**
 * Sends monthly reminder emails to all admins
 * This function calls the backend API which uses Nodemailer for email delivery
 * 
 * SECURITY: Backend handles email delivery with secure credentials
 * No EmailJS keys are exposed on the client-side
 */
export async function sendEmailReminderToAllAdmins() {
    try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
            console.error('❌ No authenticated user found');
            throw new Error('User must be authenticated to send reminders');
        }

        // Get the user's ID token
        const idToken = await currentUser.getIdToken();

        console.log('Calling backend email service...');

        // Call the backend API
        const response = await fetch('/api/email/send-reminders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            console.error(`❌ Backend API error (${response.status}):`, result.error || result.details);
            throw new Error(result.error || 'Failed to send reminder emails');
        }

        console.log(`✅ Email reminder request processed successfully:`, result.message);
        console.log(`   - Admins notified: ${result.successCount}/${result.adminsCount}`);

        if (result.failureCount > 0) {
            console.warn(`   - Failed emails: ${result.failureCount}`);
        }

        return result;
    } catch (error) {
        console.error('Error in sendEmailReminderToAllAdmins:', error);
        throw error;
    }
}

/**
 * Sends contribution reminders to all members/admins (single email with BCC)
 */
export async function sendContributionReminder() {
    try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
            throw new Error('User must be authenticated to send reminders');
        }

        const idToken = await currentUser.getIdToken();

        console.log('Sending contribution reminder...');

        const response = await fetch('/api/email/send-contribution-reminders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to send contribution reminders');
        }

        console.log(`✅ Contribution reminder sent to ${result.recipientCount} members`);
        return result;
    } catch (error) {
        console.error('Error in sendContributionReminder:', error);
        throw error;
    }
}

/**
 * Sends loan repayment reminders to members with outstanding loans
 */
export async function sendLoanReminder() {
    try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
            throw new Error('User must be authenticated to send reminders');
        }

        const idToken = await currentUser.getIdToken();

        console.log('Sending loan reminders...');

        const response = await fetch('/api/email/send-loan-reminders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to send loan reminders');
        }

        console.log(`✅ Loan reminders sent to ${result.successCount} members`);
        return result;
    } catch (error) {
        console.error('Error in sendLoanReminder:', error);
        throw error;
    }
}

/**
 * Sends notification for loan requests or decisions
 */
async function sendLoanEmailNotification(type: 'request' | 'decision', payload: any) {
    try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const idToken = await currentUser.getIdToken();
        const response = await fetch('/api/email/loan-notification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({ type, payload })
        });
        return await response.json();
    } catch (e) {
        console.error("Email notification failed", e);
    }
}

export const emailService = {
    sendLoanRequestAlert: (memberName: string, amount: number, loanType: string) =>
        sendLoanEmailNotification('request', { memberName, amount, loanType }),

    sendLoanDecisionAlert: (memberId: string, status: string, loanType: string, amount: number, reason?: string) =>
        sendLoanEmailNotification('decision', { memberId, status, loanType, amount, reason })
};

/**
 * DEPRECATED: Old EmailJS direct call removed
 */
export const EMAIL_CONFIG = {
    DEPRECATED: true,
};

