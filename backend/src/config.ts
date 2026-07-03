import { sharedConfig } from '@ticketuno/shared';
import dotenv from 'dotenv';
import path from 'path';

// Load .env in development
if (process.env.NODE_ENV === 'development') {
  dotenv.config({ path: path.join(__dirname, '../.env') });
}
// If not developing we have provider's variables available in environment

// Backend-only config
const backendConfig = {
  db: {
    database: 'sqlite',
    path: '../data/ticketuno.db',
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
    verificationCode: { expirationMinutes: 15 },
    resetPasswordCode: { expirationMinutes: 15 },
    oauth: {},
    tokenExpirationDays: 2,
    tokenShortExpirationDays: 1,
  },
  email: {
    from: 'TicketUno <no-reply@ticketuno.farmatime.it>',
    linkToTermsAndConditions: 'https://ticketuno.fly.dev/terms-and-conditions',
  },
  stripe: {
    secretKey: process.env.STRIPE_MODE === 'test'
      ? process.env.STRIPE_API_KEY_TEST || ''
      : process.env.STRIPE_API_KEY_LIVE || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    platformFeePercent: Number(process.env.STRIPE_PLATFORM_FEE_PERCENT) || 5,
    platformFeeFixed: Number(process.env.STRIPE_PLATFORM_FEE_FIXED) || 50,
    currency: 'eur',
    connect: {
      clientId: process.env.STRIPE_CONNECT_CLIENT_ID || '',
      redirectUri: `${sharedConfig.app.baseUrlBackend}/api/v1/paymentsStripe/connect/oauth/callback`,
    },
  },
  host: {
    dev: { name: 'localhost', port: 3000 },
  },
  assets: {
    path: './assets',
    defaultEventPosterImageName: 'defaultEventPoster.png',
  },
  server: {
    delayMilliseconds: 0,
  },
};

// Combine core + backend config
const config = {
  ...sharedConfig,
  ...backendConfig,
  // Ensure app is properly merged
  app: {
    ...sharedConfig.app,
  },
};

// Safety checks
if (process.env.NODE_ENV !== 'development') {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be set in production!');
  // ... other checks
}

export default config;
