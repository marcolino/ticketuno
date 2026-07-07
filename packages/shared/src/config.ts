import {
  APP_NAME,
  CODENAME,
  HOLDER,
  API,
  CURRENCIES,
  DEFAULT_CURRENCY,
  LANGUAGES,
  DEFAULT_LANGUAGE,
  DEFAULT_COUNTRY,
  DEFAULT_TIMEZONE,
  DEFAULT_PHONE_PREFIX,
  NGROK_URL
} from './constants';

// ── Environment detection ──────────────────────────────────────────────
const nodeEnv = process.env.NODE_ENV || 'development';
export const isDev = nodeEnv === 'development';
export const isProd = nodeEnv === 'production';
export const isStaging = nodeEnv === 'staging';

// ── URLs ──────────────────────────────────────────────────────────────────
const baseUrlFrontendDevelopment = NGROK_URL || 'http://localhost:3000';
const baseUrlBackendDevelopment = NGROK_URL || 'http://localhost:3001';

const baseUrlFrontendStaging = `https://${CODENAME}-staging.fly.dev`;
const baseUrlBackendStaging = `https://${CODENAME}-staging.fly.dev`;

const baseUrlFrontendProduction = `https://${CODENAME}.fly.dev`;
const baseUrlBackendProduction = `https://${CODENAME}.fly.dev`;

const resolve = (dev: string, staging: string, prod: string) =>
  isProd ? prod : isStaging ? staging : dev;

// ── Currencies ──────────────────────────────────────────────────────────
// export const currencies = {
//   EUR: { symbol: '€', name: 'Euro' },
//   USD: { symbol: '$', name: 'US Dollar' },
//   GBP: { symbol: '£', name: 'British Pound' },
//   JPY: { symbol: '¥', name: 'Japanese Yen' },
// } as const;

export type CurrencyCode = keyof typeof CURRENCIES;

// export const languages = {
//   en: { name: 'English', flag: '🇬🇧' },
//   it: { name: 'Italiano', flag: '🇮🇹' },
//   fr: { name: 'Français', flag: '🇫🇷' },
//   zh: { name: 'Chinese', flag: '🇨🇳' },
// } as const;

// ── Shared Config ──────────────────────────────────────────────────────
export const sharedConfig = {
  app: {
    holder: {
      name: HOLDER.name,
      email: HOLDER.email,
    },

    api: {
      prefix: API.prefix,
      version: API.version,
      timeoutSeconds: isDev ? API.timeoutSeconds.development : API.timeoutSeconds.production,
      headers: {
        'Content-Type': API.headers['Content-Type'],
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

    languages: LANGUAGES,
    defaultLanguage: DEFAULT_LANGUAGE,
    defaultCountry: DEFAULT_COUNTRY,
    defaultTimezone: DEFAULT_TIMEZONE,
    defaultPhonePrefix: DEFAULT_PHONE_PREFIX,
    currencies: CURRENCIES,
    defaultCurrency: DEFAULT_CURRENCY as CurrencyCode,

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
