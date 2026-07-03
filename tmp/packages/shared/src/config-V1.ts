// packages/shared/src/config.ts

import {
  APP_NAME,
  CODENAME,
  CURRENCIES,
  DEFAULT_CURRENCY,
  LANGUAGES,
  DEFAULT_LANGUAGE,
} from './constants';

// ── Environment detection ──────────────────────────────────────────────

// Detect if we're in Node.js
const isNodeEnv = typeof process !== 'undefined' && process.env?.NODE_ENV !== undefined;

// Detect if we're in a Vite/browser environment
const isViteEnv = typeof import.meta !== 'undefined' && import.meta.env !== undefined;

// Get environment from the appropriate source
const getEnvironment = (): string => {
  // Try Node.js first
  if (isNodeEnv) {
    return process.env.NODE_ENV || 'development';
  }
  
  // Try Vite's import.meta
  if (isViteEnv) {
    return (import.meta as any).env?.MODE || 'development';
  }
  
  // Default fallback
  return 'development';
};

const nodeEnv = getEnvironment();
const isProd = nodeEnv === 'production';
const isStaging = nodeEnv === 'staging';
const isDev = !isProd && !isStaging;

// ── URLs ──────────────────────────────────────────────────────────────────
const baseUrlFrontendDevelopment = 'http://localhost:3000';
const baseUrlBackendDevelopment = 'http://localhost:3001';

const baseUrlFrontendStaging = `https://${CODENAME}-staging.fly.dev`;
const baseUrlBackendStaging = `https://${CODENAME}-staging.fly.dev`;

const baseUrlFrontendProduction = `https://${CODENAME}.fly.dev`;
const baseUrlBackendProduction = `https://${CODENAME}.fly.dev`;

const resolve = (dev: string, staging: string, prod: string) =>
  isProd ? prod : isStaging ? staging : dev;

// ── Currencies ──────────────────────────────────────────────────────────
export const currencies = {
  EUR: { symbol: '€', name: 'Euro' },
  USD: { symbol: '$', name: 'US Dollar' },
  GBP: { symbol: '£', name: 'British Pound' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
} as const;

export type CurrencyCode = keyof typeof currencies;

export const languages = {
  en: { name: 'English', flag: '🇬🇧' },
  it: { name: 'Italiano', flag: '🇮🇹' },
  fr: { name: 'Français', flag: '🇫🇷' },
  zh: { name: 'Chinese', flag: '🇨🇳' },
} as const;

// ── Shared Config ──────────────────────────────────────────────────────
export const sharedConfig = {
  app: {
    holder: {
      name: 'Marco Solari',
      email: 'marcosolari@gmail.com',
    },

    api: {
      prefix: 'api',
      version: 'v1',
      timeoutSeconds: isDev ? 5 : 15,
      headers: {
        'Content-Type': 'application/json',
      },
    },

    auth: {
      tokenExpirationTimeWarningAdvanceSeconds: 5 * 60,
    },

    email: {
      bulk: {
        preview: {
          UserName: 'Alice',
          UserSurname: 'Bianchi',
          UserEmail: 'alice.bianchi@mail.com',
        },
      },
    },

    codename: CODENAME,
    name: APP_NAME,

    baseUrlBackend: resolve(
      baseUrlBackendDevelopment,
      baseUrlBackendStaging,
      baseUrlBackendProduction
    ),

    baseUrlFrontend: resolve(
      baseUrlFrontendDevelopment,
      baseUrlFrontendStaging,
      baseUrlFrontendProduction
    ),

    baseUrlProduction: baseUrlFrontendProduction,
    baseUrlStaging: baseUrlFrontendStaging,

    baseUrlBackendDevelopment,
    baseUrlFrontendDevelopment,

    languages,

    defaultLanguage: 'it',
    defaultCountry: 'it',
    defaultTimezone: 'Europe/Rome',
    defaultPhonePrefix: '+39',

    currencies,

    defaultCurrency: 'EUR' as CurrencyCode,

    theme: {
      defaultType: 'native',
      defaultMode: 'system',
    },

    consent: {
      version: '1.0.0',
      cookies: {
        technical: true,
        analytics: true,
        marketing: true,
      },
      communication: {
        marketingEmails: true,
        pushNotifications: true,
      },
    },

    reservations: {
      ticketing: {
        useQrcode: true,
        qrcode: {},
        format: 'A4',
        nominal: false,
      },
      purchases: {
        gateways: {
          free: {},
          cash: {},
          stripe: {},
        },
        gateway: 'stripe',
      },
    },

    images: {
      uploadFolder: '/uploads',
    },
  },

  slack: {
    webhookUrl: 'https://hooks.slack.com/services',
  },
} as const;

export type SharedConfig = typeof sharedConfig;
export { isDev, isProd, isStaging };
