import { sharedConfig } from '@ticketuno/shared';
import dotenv from 'dotenv';
import path from 'path';

// Load .env in development
if (process.env.NODE_ENV === 'development') {
  dotenv.config({ path: path.join(__dirname, '../.env') });
}

const backendDefaults = {
  host: {
    dev: {
      name: 'localhost',
      port: 3000,
    },
  },
  db: {
    database: 'sqlite',
    path: '../data/ticketuno.db',
  },
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
    },
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
    tokenExpirationDays: 2,
    tokenShortExpirationDays: 1,
  },
  server: {
    delayMilliseconds: 0,
  },
  email: {
    from: 'TicketUno <no-reply@ticketuno.farmatime.it>', // NOTE: use a private email address, when available
    linkToTermsAndConditions: 'https://ticketuno.fly.dev/terms-and-conditions',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    platformFeePercent: Number(process.env.STRIPE_PLATFORM_FEE_PERCENT) || 5, // 5%
    platformFeeFixed: Number(process.env.STRIPE_PLATFORM_FEE_FIXED) || 50, // €0.50 in cents
    currency: 'eur', // TODO: rename defaultCurrency, and use defaultCurrency in shared config
    connect: {
      clientId: process.env.STRIPE_CONNECT_CLIENT_ID || '',
      redirectUri: `${process.env.BACKEND_URL}/api/v1/stripe/connect/oauth/callback`,
    },
  },
  multiTenant: {
    enabled: process.env.MULTI_TENANT_ENABLED === 'true',
    tenantsPath: process.env.TENANTS_PATH || './tenants',
  },
};

const config = {
  ...sharedConfig,
  ...backendDefaults,
};

// safety checks
if (process.env.NODE_ENV !== 'development') {
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
