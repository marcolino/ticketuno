import { i18n } from '../i18n';
import emailService from '../services/emailService';
import { getErrorMessage } from '../utils/errorHandler';
import { database } from '../db/database';
import config from '../config';

import jwt from "jsonwebtoken";

const EMAIL_SECRET = process.env.EMAIL_TOKEN_SECRET!;

// export function generateMarketingUnsubscribeToken(userId: string) {
//   return jwt.sign(
//     {
//       sub: userId,
//       type: "marketing-unsubscribe"
//     },
//     EMAIL_SECRET,
//     { expiresIn: "90d" }
//   );
// }

export function verifyMarketingUnsubscribeToken(token: string) {
  return jwt.verify(token, EMAIL_SECRET) as {
    sub: string;
    type: string;
  };
}

export function generateConsentToken(userId: string, type: string = "consent") {
  // const token = jwt.sign(
  //   {
  //     sub: userId,
  //     type,
  //   },
  //   EMAIL_SECRET,
  //   { expiresIn: "1h" }
  // );

  try {
    const token = database.createToken(userId, type);
    return token;
  } catch (error: unknown) {
    throw new Error(i18n.t('Cannot generate consent token: {{err}}', getErrorMessage(error)));
  }
}

export function verifyConsentToken(token: string, type: string = "consent") {
  // return jwt.verify(token, EMAIL_SECRET) as {
  //   sub: string;
  //   type: string;
  // };
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
    //confirmUrl: `${config.app.baseUrl}/`, // TODO ...
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
  //const isMarketing = false;
  const isMarketing = true; // TODO: DEBUG ONLYYYYYYYYYYYYYYYYYYYYYYYYYY

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
    //confirmUrl: `${config.app.baseUrl}/`, // TODO ...
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

export const sendPasswordResetEmailOLD = async (email: string, code: string): Promise<void> => {
  const subject = i18n.t('Reset your {{appName}} password', { appName: config.app.name });
  const body = i18n.t(`
You requested to reset your password.

Your password reset code is: {{code}}

This code will expire in {{expirationMinutes}} minutes.

If you didn't request this, please ignore this email and your password will remain unchanged.
`, {code, expirationMinutes: config.auth.verificationCode.expirationMinutes});
  
  //await sendEmail(email, subject, body);
};
*/
