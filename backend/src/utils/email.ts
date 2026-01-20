import { i18n } from '../i18n';
import config from '../config';

// Mock email sender - replace with real service (SendGrid, AWS SES, etc.)
export const sendEmail = async (to: string, subject: string, body: string): Promise<void> => {
  console.log('===============================================');
  console.log(`📧 EMAIL SENT TO: ${to}`);
  console.log(`📌 SUBJECT: ${subject}`);
  console.log(`📄 BODY:\n${body}`);
  console.log('===============================================');
  
  // In production, use a real email service:
  /*
  import sgMail from '@sendgrid/mail';
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  
  await sgMail.send({
    to,
    from: 'noreply@ticketuno.com',
    subject,
    text: body,
    html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
  });
  */
};

export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
};

export const isCodeValid = (expiry: string): boolean => {
  return new Date(expiry) > new Date();
};

export const sendVerificationEmail = async (email: string, code: string): Promise<void> => {
  const subject = i18n.t('Verify your {{appname}} account', config.app.fullname);
  const body = i18n.t(`
Welcome to {{appName}}!

Your verification code is: {{code}}

This code will expire in {{expirationMinutes}} minutes.

If you didn't request this, please ignore this email.
`, {appName: config.app.fullname, code, expirationMinutes: config.app.auth.verificationCode.expirationMinutes});
  
  await sendEmail(email, subject, body);
};

export const sendPasswordResetEmail = async (email: string, code: string): Promise<void> => {
  const subject = i18n.t('Reset your {{appName}} password', { appName: config.app.fullname });
  const body = i18n.t(`
You requested to reset your password.

Your password reset code is: {{code}}

This code will expire in {{expirationMinutes}} minutes.

If you didn't request this, please ignore this email and your password will remain unchanged.
`, {code, expirationMinutes: config.app.auth.verificationCode.expirationMinutes});
  
  await sendEmail(email, subject, body);
};
