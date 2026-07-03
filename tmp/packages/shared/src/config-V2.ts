import {
  APP_NAME,
  CODENAME,
  CURRENCIES,
  DEFAULT_CURRENCY,
  LANGUAGES,
  DEFAULT_LANGUAGE,
} from './constants';

const baseUrlFrontendDevelopment = 'http://localhost:3000';
const baseUrlBackendDevelopment = 'http://localhost:3001';

const baseUrlFrontendStaging = `https://${CODENAME}-staging.fly.dev`;
const baseUrlBackendStaging = `https://${CODENAME}-staging.fly.dev`;

const baseUrlFrontendProduction = `https://${CODENAME}.fly.dev`;
const baseUrlBackendProduction = `https://${CODENAME}.fly.dev`;

const isProd = process.env.NODE_ENV === 'production';
const isStaging = process.env.NODE_ENV === 'staging';

const resolve = (dev: string, staging: string, prod: string) =>
  isProd ? prod : isStaging ? staging : dev;

/* ---------------------------- currencies (ok) ---------------------------- */

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

/* ----------------------------- shared config ------------------------------ */

export const sharedConfig = {
  app: {
    holder: {
      name: 'Marco Solari',
      email: 'marcosolari@gmail.com',
    },

    api: {
      prefix: 'api',
      version: 'v1',
      timeoutSeconds: process.env.NODE_ENV === 'development' ? 5 : 15,
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

export type SharedConfig = typeof sharedConfig