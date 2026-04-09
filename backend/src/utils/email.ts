import jwt from "jsonwebtoken";
import { i18n } from '../i18n';
import emailService from '../services/emailService';
import { getErrorMessage } from '../shared/utils/misc';
import { database } from '../db/database';
import { Attachment } from '../shared/types/email';
import config from '../config';

export function verifyMarketingUnsubscribeToken(token: string) {
  return jwt.verify(token, process.env.EMAIL_TOKEN_SECRET!) as {
    sub: string;
    type: string;
  };
}

export function generateConsentToken(userId: string, type: string = "consent") {
  try {
    const token = database.createToken(userId, type);
    return token;
  } catch (error: unknown) {
    throw new Error(i18n.t('Cannot generate consent token: {{err}}', getErrorMessage(error)));
  }
}

export function verifyConsentToken(token: string, type: string = "consent") {
  return !!database.getUserByToken(token, type)
}

export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
};

export const isVerificationCodeValid = (expiry: string): boolean => {
  return new Date(expiry) > new Date();
};

export const sendVerificationEmail = async (email: string, code: string): Promise<void> => {
  const to = email;
  const subject = i18n.t('Verify your {{appName}} email', { appName: config.app.name });
  const template = "verificationEmail";
  const variables = {
    appName: config.app.name,
    code,
    expirationMinutes: config.auth.verificationCode.expirationMinutes,
  };
  const isMarketing = false;

  await emailService.send({
    to,
    subject,
    template,
    variables,
    isMarketing,
  });
}

export const sendWelcomeEmail = async (email: string, userName: string, ctaUrl: string): Promise<void> => {
  const to = email;
  const subject = i18n.t('Welcome to {{appName}}!', { appName: config.app.name });
  const template = "welcomeEmail";
  const variables = {
    userName,
    appName: config.app.name,
    ctaUrl,
  };
  const isMarketing = false;

  await emailService.send({
    to,
    subject,
    template,
    variables,
    isMarketing,
  });
}

export const sendPasswordResetEmail = async (email: string, code: string): Promise<void> => {
  const to = email;
  const subject = i18n.t('Verify your {{appName}} password reset', { appName: config.app.name });
  const template = "passwordResetEmail";
  const variables = {
    appName: config.app.name,
    code,
    expirationMinutes: config.auth.verificationCode.expirationMinutes,
  };
  const isMarketing = true;

  await emailService.send({
    to,
    subject,
    template,
    variables,
    isMarketing,
  });
}

export const sendBookingConfirmationEmail = async (
  email: string,
  userName: string,
  eventName: string,
  bookingRefs: string,
  dateOfPerformance: string,
  timeOfPerformance: string,
  theaterName: string,
  seatNumbers: string,
  totalPaidAmount: string,
  contactPhone: string,
  contactEmail: string,
  //linkToTermsAndConditions: string,
  bookingIsPaid: boolean,
  useQrcode: boolean,
  attachedTickets: Attachment[],
): Promise<void> => {
  const to = email;
  const subject = i18n.t('Your Booking Confirmation for {{eventName}}!', { eventName });
  const template = "bookingConfirmationEmail";
  const variables = {
    //appName: config.app.name,
    userName,
    eventName,
    bookingRefs,
    dateOfPerformance,
    timeOfPerformance,
    theaterName,
    seatNumbers,
    totalPaidAmount,
    contactPhone,
    contactEmail,
    //linkToTermsAndConditions,
    bookingIsPaid,
    useQrcode,
    attachedTickets,
  };

  const isMarketing = false;

  await emailService.send({
    to,
    subject,
    template,
    variables,
    isMarketing,
    attachments: attachedTickets,
  });
}

/*
// Mock email sender - replace with real service (SendGrid, AWS SES, etc.)
export const sendEmail = async (to: string, subject: string, body: string): Promise<void> => {
  console.log('===============================================');
  console.log(`📧 EMAIL SENT TO: ${to}`);
  console.log(`📌 SUBJECT: ${subject}`);
  console.log(`📄 BODY:\n${body}`);
  console.log('===============================================');
};

export const sendVerificationEmailOLD = async (email: string, code: string): Promise<void> => {
  const subject = i18n.t('Verify your {{appname}} account', config.app.name);
  const body = i18n.t(`
Welcome to {{appName}}!

Your verification code is: {{code}}

This code will expire in {{expirationMinutes}} minutes.

If you didn't request this, please ignore this email.
`, {appName: config.app.name, code, expirationMinutes: config.auth.verificationCode.expirationMinutes});
  
  //await sendEmail(email, subject, body);
};
*/
