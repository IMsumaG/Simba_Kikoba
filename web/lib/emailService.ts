import nodemailer from 'nodemailer';

// Email transporter configuration
// Using Gmail SMTP (requires App Password, not regular password)
// For other providers, adjust the transporter config accordingly
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Gmail App Password (not regular password)
    },
});

// Alternative: For generic SMTP servers
// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: parseInt(process.env.SMTP_PORT || '587'),
//   secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASSWORD,
//   },
// });

interface EmailOptions {
    to?: string;
    bcc?: string[];
    subject: string;
    html: string;
    text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
    try {
        // Send the email
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER || 'noreply@kikoba.app',
            to: options.to || undefined,
            bcc: options.bcc || undefined,
            subject: options.subject,
            text: options.text || '',
            html: options.html,
        });

        console.log(`✅ Email sent successfully. Message ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send email:`, error);
        throw error;
    }
}

/**
 * Send monthly reminder email to a single admin
 */
export async function sendMonthlyReminder(email: string, name: string): Promise<boolean> {
    const subject = 'KIKOBA Monthly Reminder - Pay Your Loans & Contributions';

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #4CAF50;">KIKOBA Monthly Reminder</h2>
        
        <p>Dear ${name},</p>
        
        <p>This is a friendly reminder that the end of the month is approaching. Please ensure that:</p>
        
        <ul style="line-height: 1.8;">
            <li><strong>Loan Repayments</strong> - Make your scheduled loan payments on time</li>
            <li><strong>Monthly Contributions</strong> - Submit your contribution for this month</li>
        </ul>
        
        <p>Please log into your KIKOBA account to make any outstanding payments.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px; color: #666;">
                <strong>KIKOBA Management System</strong><br/>
                Promoting financial inclusion through group savings
            </p>
        </div>
        
        <p style="color: #666; font-size: 12px;">
            Thank you for being part of the KIKOBA family!
        </p>
    </div>
    `;

    const textContent = `
    KIKOBA Monthly Reminder
    
    Dear ${name},
    
    This is a friendly reminder that the end of the month is approaching. Please ensure that:
    
    - Loan Repayments: Make your scheduled loan payments on time
    - Monthly Contributions: Submit your contribution for this month
    
    Please log into your KIKOBA account to make any outstanding payments.
    
    Thank you for being part of the KIKOBA family!
    `;

    return sendEmail({
        to: email,
        subject,
        html: htmlContent,
        text: textContent,
    });
}

/**
 * Send contribution reminder to all members/admins with BCC
 */
export async function sendContributionReminder(recipientEmails: string[], memberNames: string[]): Promise<boolean> {
    const subject = 'KIKOBA Contribution Reminder - Monthly Hisa & Jamii Payment';

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #4CAF50;">KIKOBA Contribution Reminder</h2>
        
        <p>Dear Member,</p>
        
        <p>This is a friendly reminder to contribute your monthly savings to KIKOBA:</p>
        
        <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>Hisa Contribution:</strong> 30,000</p>
            <p style="margin: 10px 0;"><strong>Jamii Contribution:</strong> 5,000</p>
        </div>
        
        <p>Please ensure these contributions are submitted by the end of this month. Contributions are essential to maintain the strength of our group savings scheme.</p>
        
        <p>Log into your KIKOBA account to make your contributions.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px; color: #666;">
                <strong>KIKOBA Management System</strong><br/>
                Promoting financial inclusion through group savings
            </p>
        </div>
        
        <p style="color: #666; font-size: 12px;">
            Thank you for being part of the KIKOBA family!
        </p>
    </div>
    `;

    const textContent = `
    KIKOBA Contribution Reminder
    
    Dear Member,
    
    This is a friendly reminder to contribute your monthly savings to KIKOBA:
    
    Hisa Contribution: 30,000
    Jamii Contribution: 5,000
    
    Please ensure these contributions are submitted by the end of this month.
    
    Log into your KIKOBA account to make your contributions.
    
    Thank you for being part of the KIKOBA family!
    `;

    return sendEmail({
        bcc: recipientEmails,
        subject,
        html: htmlContent,
        text: textContent,
    });
}

/**
 * Send individual loan repayment reminder with loan balance
 */
export async function sendLoanReminder(email: string, name: string, loans: Array<{ type: string; amount: number; balance: number }>): Promise<boolean> {
    const subject = 'KIKOBA Loan Repayment Reminder - Outstanding Balance';

    const loanDetails = loans
        .map(
            loan =>
                `<li style="margin: 8px 0;"><strong>${loan.type} Loan</strong> - Balance: ${loan.balance.toLocaleString()} (Original: ${loan.amount.toLocaleString()})</li>`
        )
        .join('');

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #E74C3C;">KIKOBA Loan Repayment Reminder</h2>
        
        <p>Dear ${name},</p>
        
        <p>You have outstanding loan(s) with KIKOBA. Please review your loan details below and make timely repayments:</p>
        
        <div style="background-color: #ffe6e6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold;">Your Outstanding Loans:</p>
            <ul style="margin: 0; padding-left: 20px;">
                ${loanDetails}
            </ul>
        </div>
        
        <p>Please make your loan repayments as soon as possible to avoid any penalties. Log into your KIKOBA account to make a payment.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px; color: #666;">
                <strong>KIKOBA Management System</strong><br/>
                Promoting financial inclusion through group savings
            </p>
        </div>
        
        <p style="color: #666; font-size: 12px;">
            Thank you for being part of the KIKOBA family!
        </p>
    </div>
    `;

    const loanText = loans.map(loan => `${loan.type} Loan - Balance: ${loan.balance} (Original: ${loan.amount})`).join('\n');

    const textContent = `
    KIKOBA Loan Repayment Reminder
    
    Dear ${name},
    
    You have outstanding loan(s) with KIKOBA. Please review your loan details below:
    
    Your Outstanding Loans:
    ${loanText}
    
    Please make your loan repayments as soon as possible. Log into your KIKOBA account to make a payment.
    
    Thank you for being part of the KIKOBA family!
    `;

    return sendEmail({
        to: email,
        subject,
        html: htmlContent,
        text: textContent,
    });
}

/**
 * Send notification to admins about a new loan request
 */
export async function sendLoanRequestNotification(adminEmails: string[], memberName: string, amount: number, type: string): Promise<boolean> {
    const subject = `New Loan Request: ${memberName}`;
    const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #F57C00;">New Loan Request</h2>
        <p>A member has requested a new loan that requires your approval.</p>
        <div style="background: #F8FAFC; padding: 15px; border-radius: 10px; margin: 20px 0;">
            <p><strong>Member:</strong> ${memberName}</p>
            <p><strong>Loan Type:</strong> ${type}</p>
            <p><strong>Amount:</strong> ${amount.toLocaleString()} TZS</p>
        </div>
        <p>Please log in to the SBK portal to cast your vote.</p>
    </div>
    `;
    return sendEmail({ bcc: adminEmails, subject, html: htmlContent });
}

/**
 * Send decision notification to member
 */
export async function sendLoanDecisionNotification(email: string, name: string, status: string, type: string, amount: number, reason?: string): Promise<boolean> {
    const isApproved = status === 'Approved';
    const subject = `Loan Request Update: ${status}`;
    const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: ${isApproved ? '#10B981' : '#EF4444'};">Loan Request ${status}</h2>
        <p>Your request for a ${type} loan of <strong>${amount.toLocaleString()} TZS</strong> has been ${status.toLowerCase()}.</p>
        ${!isApproved && reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>Log in to your account for more details.</p>
    </div>
    `;
    return sendEmail({ to: email, subject, html: htmlContent });
}

/**
 * Verify email service is configured
 */
export async function verifyEmailConfiguration(): Promise<boolean> {
    try {
        // Verify the transporter connection
        await transporter.verify();
        console.log('✅ Email service configuration verified successfully');
        return true;
    } catch (error) {
        console.error('❌ Email service configuration error:', error);
        return false;
    }
}
