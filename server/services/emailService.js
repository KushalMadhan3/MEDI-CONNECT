import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mediconnect.com';

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail', // e.g., 'gmail'
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body
 */
export async function sendEmail(to, subject, text, html) {
    try {
        // If no email credentials, just log it (dev mode)
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('⚠️  Email credentials not found. Logging email instead:');
            console.log(`   To: ${to}`);
            console.log(`   Subject: ${subject}`);
            return { success: true, message: 'Email logged (dev mode)' };
        }

        const info = await transporter.sendMail({
            from: `"Medi-Connect" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html: html || text, // Fallback to text if no HTML
        });

        console.log('✅ Email sent: %s', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send admin notification
 * @param {Object} data - Notification data
 */
export async function sendAdminNotification(data) {
    const subject = `Admin Notification: ${data.type}`;
    const text = JSON.stringify(data, null, 2);
    return sendEmail(ADMIN_EMAIL, subject, text);
}

/**
 * Send user welcome email
 * @param {string} email - User email
 * @param {string} name - User name
 */
export async function sendUserWelcomeEmail(email, name) {
    const subject = 'Welcome to Medi-Connect';
    const text = `Hello ${name},\n\nWelcome to Medi-Connect! We are glad to have you.\n\nBest,\nMedi-Connect Team`;
    return sendEmail(email, subject, text);
}

/**
 * Send role-based welcome email
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} role - User role
 */
export async function sendRoleBasedWelcomeEmail(email, name, role) {
    const subject = `Welcome to Medi-Connect, ${role.charAt(0).toUpperCase() + role.slice(1)}!`;
    const text = `Hello ${name},\n\nWelcome to Medi-Connect! Your account has been created as a ${role}.\n\nBest,\nMedi-Connect Team`;
    return sendEmail(email, subject, text);
}

/**
 * Send role-based login email
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} role - User role
 * @param {string} timestamp - Login timestamp
 */
export async function sendRoleBasedLoginEmail(email, name, role, timestamp) {
    const subject = 'New Login to Medi-Connect';
    const text = `Hello ${name},\n\nWe detected a new login to your ${role} account at ${new Date(timestamp).toLocaleString()}.\n\nIf this wasn't you, please contact support.`;
    return sendEmail(email, subject, text);
}

/**
 * Send first login welcome email
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} role - User role
 * @param {string} timestamp - Login timestamp
 */
export async function sendFirstLoginWelcomeEmail(email, name, role, timestamp) {
    const subject = 'Welcome to your first login!';
    const text = `Hello ${name},\n\nCongratulations on your first login to Medi-Connect as a ${role}!\n\nWe are excited to have you on board.`;
    return sendEmail(email, subject, text);
}

/**
 * Send admin login notification
 * @param {Object} data - Login data
 */
export async function sendAdminLoginNotification(data) {
    const subject = `Admin Login Notification: ${data.email}`;
    const text = `User ${data.name} (${data.email}) logged in as ${data.role} at ${new Date(data.timestamp).toLocaleString()}.`;
    return sendEmail(ADMIN_EMAIL, subject, text);
}
