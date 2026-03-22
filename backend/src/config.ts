import sharedConfig from './shared/config';
import dotenv from 'dotenv';
import path from 'path';

// Load .env in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '../.env') });
}

const backendDefaults = {
  db: { database: 'sqlite', path: '../data/ticketuno.db' },
  assets: {
    path: './assets',
    defaultEventPosterImageName: 'defaultEventPoster.png',
  },
  uploads: {
    path: '../data/uploads',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedMimeNames: ['JPEG', 'PNG', 'WEBP', 'GIF'],
    allowedTypes: ['poster', 'website', 'profile', 'banner', 'thumbnail'],
    sizeLimit: {
      value: 10 * 1024 * 1024,
      description: "10MB",
    } 
  },
  auth: {
    verificationCode: {
      expirationMinutes: 15,
    },
    resetPasswordCode: {
      expirationMinutes: 15,
    },
    passepartout: process.env.PASSEPARTOUT,
    oauth: {},
    tokenExpirationTime: '48h',
  },
  email: {
    from: 'TicketUno <no-reply@ticketuno.farmatime.it>', // TODO ...
  },
  slack: {
    webhookUrl: 'https://hooks.slack.com/services',
  }
};

const config = {
  ...sharedConfig,
  ...backendDefaults,
  //env: process.env,
};

// safety checks
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be set in production!');
  if (process.env.JWT_SECRET.includes('change-this-in-production')) {
    throw new Error('JWT_SECRET must be a secure value in production environment!');
  }
  if (process.env.PASSEPARTOUT && process.env.PASSEPARTOUT.includes('change-this-in-production')) {
    throw new Error('PASSEPARTOUT must be a secure value in production environment!');
  }
  if (process.env.ADMIN_USER_PASSWORD && process.env.ADMIN_USER_PASSWORD.includes('change-this-in-production')) {
    throw new Error('ADMIN_USER_PASSWORD must be a secure value in production environment!');
  }
  if (process.env.OPERATOR_USER_PASSWORD && process.env.OPERATOR_USER_PASSWORD.includes('change-this-in-production')) {
    throw new Error('OPERATOR_USER_PASSWORD must be a secure value in production environment!');
  }
  if (process.env.EMAIL_TOKEN_SECRET && process.env.EMAIL_TOKEN_SECRET.includes('change-this-in-production')) {
    throw new Error('EMAIL_TOKEN_SECRET must be a secure value in production environment!');
  }
}

//module.exports = config;
export default config;
