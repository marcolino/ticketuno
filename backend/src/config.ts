import dotenv from 'dotenv';
import path from 'path';
import { sharedConfig } from '@ticketuno/shared';
import { tenantContext } from './tenancy/tenantContext';

// Load .env in development
if (process.env.NODE_ENV === 'development') {
  dotenv.config({ path: path.join(__dirname, '../.env') });
}
// If not developing we have provider's variables available in environment

const dataDir = '/data';
const uploadsBaseDir = dataDir;
const defaultTenantSlug = 'demo';

// Backend-only config
const backendConfig = {
  internal: {
    adminToken: process.env.INTERNAL_ADMIN_TOKEN || '',
  },
  db: {
    database: 'sqlite',
    name: 'ticketuno.db',
    //path: path.join(dataDir, 'ticketuno.db'),
    dataRoot: dataDir,
    defaultTenantSlug: defaultTenantSlug,
  },
  uploads: {
    //path: '../data/uploads',
    get path(): string {
      const ctx = tenantContext.getStore();
      // Falls back to a fixed folder if read outside a tenant context
      // (e.g. during a bare `npm run migrations` script) — shouldn't happen in normal request flow.
      const slug = ctx?.slug ?? defaultTenantSlug;
      return path.join(uploadsBaseDir, slug, 'uploads');
    },
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
    mode: (process.env.STRIPE_MODE as 'test' | 'live') || 'test',
    secretKey: process.env.STRIPE_MODE === 'test'
      ? process.env.STRIPE_API_KEY_TEST || ''
      : process.env.STRIPE_API_KEY_LIVE || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    webhookSecretConnect: process.env.STRIPE_WEBHOOK_SECRET_CONNECT || '',
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

// Safety checks in production/staging
if (process.env.NODE_ENV !== 'development') {
  // JWT checks
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be set in production!');

  // Stripe checks
  if (config.stripe.mode !== 'test' && config.stripe.mode !== 'live') {
    throw new Error(`STRIPE_MODE must be 'test' or 'live', got: "${config.stripe.mode}"`);
  }

  const keyLooksLive = config.stripe.secretKey.startsWith('sk_live_');
  const keyLooksTest = config.stripe.secretKey.startsWith('sk_test_');
  if (config.stripe.mode === 'live' && !keyLooksLive) {
    throw new Error('STRIPE_MODE is "live" but STRIPE_API_KEY_LIVE does not look like a live key.');
  }
  if (config.stripe.mode === 'test' && !keyLooksTest) {
    throw new Error('STRIPE_MODE is "test" but STRIPE_API_KEY_TEST does not look like a test key.');
  }

  // Webhook secrets check (nuovo)
  if (!config.stripe.webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET must be set in production!');
  }
  if (!config.stripe.webhookSecretConnect) {
    throw new Error('STRIPE_WEBHOOK_SECRET_CONNECT must be set in production!');
  }

  // Other checks ...
  
}

export default config;
