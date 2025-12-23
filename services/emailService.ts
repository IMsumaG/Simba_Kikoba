import { collection, getDocs, query, where } from 'firebase/firestore';
import { Secrets } from '../constants/Secrets';
import { db } from './firebase';

export const EMAIL_CONFIG = {
    SERVICE_ID: Secrets.EMAILJS.SERVICE_ID,
    TEMPLATE_ID: Secrets.EMAILJS.TEMPLATE_ID,
    PUBLIC_KEY: Secrets.EMAILJS.PUBLIC_KEY,
    PRIVATE_KEY: Secrets.EMAILJS.PRIVATE_KEY,
};

export async function sendEmailReminderToAllAdmins() {
    try {
        const q = query(collection(db, 'users'), where('role', '==', 'Admin'));
        const querySnapshot = await getDocs(q);

        const admins: { email: string; name: string }[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.email) {
                admins.push({ email: data.email, name: data.displayName || 'Admin' });
            }
        });

        if (admins.length === 0) {
            console.log('No admins found to send emails to.');
            return;
        }

        if (EMAIL_CONFIG.SERVICE_ID === 'YOUR_EMAILJS_SERVICE_ID') {
            console.log('EmailJS config not set. Skipping email send.');
            return;
        }

        for (const admin of admins) {
            const data = {
                service_id: EMAIL_CONFIG.SERVICE_ID,
                template_id: EMAIL_CONFIG.TEMPLATE_ID,
                user_id: EMAIL_CONFIG.PUBLIC_KEY,
                accessToken: EMAIL_CONFIG.PRIVATE_KEY, // EmailJS uses 'accessToken' for the private key in REST API
                template_params: {
                    to_email: admin.email,
                    to_name: admin.name,
                    message: 'This is a monthly reminder to remind all KIKOBA members to pay their loans and monthly contributions.',
                },
            };

            const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                console.log(`Email sent successfully to ${admin.email}`);
            } else {
                const error = await response.text();
                console.error(`Email failed to send to ${admin.email}:`, error);
            }
        }
    } catch (error) {
        console.error('Error in sendEmailReminderToAllAdmins:', error);
    }
}
