module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/net [external] (net, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("net", () => require("net"));

module.exports = mod;
}),
"[externals]/dns [external] (dns, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("dns", () => require("dns"));

module.exports = mod;
}),
"[externals]/os [external] (os, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("os", () => require("os"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/tls [external] (tls, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("tls", () => require("tls"));

module.exports = mod;
}),
"[externals]/child_process [external] (child_process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("child_process", () => require("child_process"));

module.exports = mod;
}),
"[project]/web/lib/emailService.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "sendContributionReminder",
    ()=>sendContributionReminder,
    "sendEmail",
    ()=>sendEmail,
    "sendLoanReminder",
    ()=>sendLoanReminder,
    "sendMonthlyReminder",
    ()=>sendMonthlyReminder,
    "verifyEmailConfiguration",
    ()=>verifyEmailConfiguration
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$nodemailer$2f$lib$2f$nodemailer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/web/node_modules/nodemailer/lib/nodemailer.js [app-route] (ecmascript)");
;
// Email transporter configuration
// Using Gmail SMTP (requires App Password, not regular password)
// For other providers, adjust the transporter config accordingly
const transporter = __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$nodemailer$2f$lib$2f$nodemailer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});
async function sendEmail(options) {
    try {
        // Send the email
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER || 'noreply@kikoba.app',
            to: options.to || undefined,
            bcc: options.bcc || undefined,
            subject: options.subject,
            text: options.text || '',
            html: options.html
        });
        console.log(`✅ Email sent successfully. Message ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send email:`, error);
        throw error;
    }
}
async function sendMonthlyReminder(email, name) {
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
        text: textContent
    });
}
async function sendContributionReminder(recipientEmails, memberNames) {
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
        text: textContent
    });
}
async function sendLoanReminder(email, name, loans) {
    const subject = 'KIKOBA Loan Repayment Reminder - Outstanding Balance';
    const loanDetails = loans.map((loan)=>`<li style="margin: 8px 0;"><strong>${loan.type} Loan</strong> - Balance: ${loan.balance.toLocaleString()} (Original: ${loan.amount.toLocaleString()})</li>`).join('');
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
    const loanText = loans.map((loan)=>`${loan.type} Loan - Balance: ${loan.balance} (Original: ${loan.amount})`).join('\n');
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
        text: textContent
    });
}
async function verifyEmailConfiguration() {
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
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/web/app/api/email/send-contribution-reminders/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$emailService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/web/lib/emailService.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$2c$__$5b$project$5d2f$web$2f$node_modules$2f$firebase$2d$admin$29$__ = __turbopack_context__.i("[externals]/firebase-admin [external] (firebase-admin, cjs, [project]/web/node_modules/firebase-admin)");
var __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/web/node_modules/next/server.js [app-route] (ecmascript)");
;
;
;
// Initialize Firebase Admin (lazy load)
function initFirebaseAdmin() {
    if (!__TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$2c$__$5b$project$5d2f$web$2f$node_modules$2f$firebase$2d$admin$29$__["default"].apps.length) {
        if (!process.env.FIREBASE_PRIVATE_KEY) {
            console.warn('Missing FIREBASE_PRIVATE_KEY, skipping Admin init');
            return null;
        }
        try {
            __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$2c$__$5b$project$5d2f$web$2f$node_modules$2f$firebase$2d$admin$29$__["default"].initializeApp({
                credential: __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$2c$__$5b$project$5d2f$web$2f$node_modules$2f$firebase$2d$admin$29$__["default"].credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
                })
            });
        } catch (error) {
            console.error('Firebase Admin initialization error:', error);
        }
    }
    return __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$2c$__$5b$project$5d2f$web$2f$node_modules$2f$firebase$2d$admin$29$__["default"];
}
async function POST(request) {
    const app = initFirebaseAdmin();
    if (!app) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Server misconfiguration: Missing Firebase Credentials'
        }, {
            status: 500
        });
    }
    // Verify Firebase Auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Missing authorization token'
        }, {
            status: 401
        });
    }
    const token = authHeader.substring(7);
    try {
        // Verify the token and check user is an admin
        const decodedToken = await app.auth().verifyIdToken(token);
        const db = app.firestore();
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        const userData = userDoc.data();
        // Only admins can trigger reminder sends
        if (userData?.role !== 'Admin') {
            return __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Only admins can send reminder emails'
            }, {
                status: 403
            });
        }
        // Fetch all users (members and admins)
        const usersSnapshot = await db.collection('users').get();
        const users = [];
        usersSnapshot.forEach((doc)=>{
            const data = doc.data();
            if (data.email && data.status === 'Active') {
                users.push({
                    email: data.email,
                    name: data.displayName || 'Member'
                });
            }
        });
        if (users.length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                message: 'No active users found'
            });
        }
        console.log(`Sending contribution reminders to ${users.length} users via BCC...`);
        // Extract emails and names
        const emailList = users.map((u)=>u.email);
        const namesList = users.map((u)=>u.name);
        // Send single email with all recipients in BCC
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$lib$2f$emailService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sendContributionReminder"])(emailList, namesList);
        console.log(`✅ Contribution reminder sent via BCC to ${users.length} users`);
        return __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            message: `Contribution reminder sent to ${users.length} users`,
            recipientCount: users.length
        });
    } catch (error) {
        console.error('Error sending contribution reminders:', error);
        if (error.code === 'auth/invalid-id-token' || error.code === 'auth/argument-error') {
            return __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Invalid authorization token'
            }, {
                status: 401
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to send contribution reminders',
            details: error.message
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__8c761029._.js.map