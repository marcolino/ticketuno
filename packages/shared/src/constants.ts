export const APP_NAME = 'TicketUno';
export const CODENAME = 'ticketuno';

export const HOLDER = {
  name: 'Marco Solari',
  email: 'marcosolari@gmail.com',
} as const;

/* ---------------------------------- API ---------------------------------- */

export const API = {
  prefix: 'api',
  version: 'v1',

  timeoutSeconds: {
    development: 5,
    production: 15,
  },

  headers: {
    'Content-Type': 'application/json',
  },
} as const;

/* -------------------------------- CURRENCIES ------------------------------ */

export const CURRENCIES = {
  EUR: { symbol: '€', name: 'Euro' },
  USD: { symbol: '$', name: 'US Dollar' },
  GBP: { symbol: '£', name: 'British Pound' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export const DEFAULT_CURRENCY: CurrencyCode = 'EUR';

/* -------------------------------- LANGUAGES ------------------------------- */

export const LANGUAGES = {
  en: { name: 'English', flag: '🇬🇧' },
  it: { name: 'Italiano', flag: '🇮🇹' },
  fr: { name: 'Français', flag: '🇫🇷' },
  zh: { name: 'Chinese', flag: '🇨🇳' },
} as const;

export const DEFAULT_LANGUAGE = 'it';
export const DEFAULT_COUNTRY = 'it';
export const DEFAULT_TIMEZONE = 'Europe/Rome';
export const DEFAULT_PHONE_PREFIX = '+39';

/* ---------------------------------- EMAIL -------------------------------- */

export const EMAIL = {
  bulkPreview: {
    UserName: 'Alice',
    UserSurname: 'Bianchi',
    UserEmail: 'alice.bianchi@mail.com',
  },
} as const;

/* ---------------------------------- SLACK -------------------------------- */

export const SLACK = {
  webhookUrl: 'https://hooks.slack.com/services',
} as const;
