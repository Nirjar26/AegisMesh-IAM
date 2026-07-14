const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

function buildFrontendUrl(pathname, token) {
    const frontendOrigin = new URL(process.env.FRONTEND_URL || 'http://localhost:3000').origin; // NOSONAR
    return `${frontendOrigin}${pathname}?token=${encodeURIComponent(token)}`;
}

function buildEmailTemplate(title, body, buttonUrl, buttonText, expiryText) {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a2e; color: #e0e0e0; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ff9900; margin: 0;">🔐 IAM Auth</h1>
          <p style="color: #888;">Identity & Access Management</p>
        </div>
        <h2 style="color: #fff;">${title}</h2>
        <p>${body}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${buttonUrl}" style="background-color: #ff9900; color: #000; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            ${buttonText}
          </a>
        </div>
        <p style="font-size: 12px; color: #666;">${expiryText}</p>
      </div>
    `;
}

/**
 * Initialize email transporter
 * In development, creates an Ethereal test account
 */
async function initializeTransporter() {
    if (transporter) return transporter;

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number.parseInt(process.env.SMTP_PORT, 10),
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    } else {
        // Create Ethereal test account for development
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        logger.info('📧 Ethereal email account created', { user: testAccount.user });
    }

    return transporter;
}

async function sendEmail({
    to,
    subject,
    templateTitle,
    templateBody,
    buttonUrl,
    buttonText,
    expiryText,
}) {
    const t = await initializeTransporter();
    const info = await t.sendMail({
        from: '"IAM Auth System" <noreply@iam-auth.com>',
        to,
        subject,
        html: buildEmailTemplate(templateTitle, templateBody, buttonUrl, buttonText, expiryText),
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
        logger.info(`📧 Preview URL: ${previewUrl}`);
    }
    return { messageId: info.messageId, previewUrl };
}

function sendVerificationEmail(email, token) {
    return sendEmail({
        to: email,
        subject: 'Verify your email address',
        templateTitle: 'Verify Your Email',
        templateBody:
            'Click the button below to verify your email address and activate your account:',
        buttonUrl: buildFrontendUrl('/verify-email', token),
        buttonText: 'Verify Email',
        expiryText:
            "If you didn't create an account, you can safely ignore this email. This link expires in 24 hours.",
    });
}

function sendPasswordResetEmail(email, token) {
    return sendEmail({
        to: email,
        subject: 'Reset your password',
        templateTitle: 'Reset Your Password',
        templateBody:
            'You requested a password reset. Click the button below to set a new password:',
        buttonUrl: buildFrontendUrl('/reset-password', token),
        buttonText: 'Reset Password',
        expiryText:
            "If you didn't request a password reset, you can safely ignore this email. This link expires in 1 hour.",
    });
}

module.exports = {
    initializeTransporter,
    sendVerificationEmail,
    sendPasswordResetEmail,
};
