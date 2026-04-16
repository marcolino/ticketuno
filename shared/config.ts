import type { AppConfig } from './types/config';

const name = 'TicketUno';
const codename = 'ticketuno';
const baseUrlFrontendDevelopment = 'http://localhost:3000';
const baseUrlBackendDevelopment = 'http://localhost:3001';
const baseUrlFrontendStaging = `https://${codename}-staging.fly.dev`;
const baseUrlBackendStaging = `https://${codename}-staging.fly.dev`;
const baseUrlFrontendProduction = `https://${codename}.fly.dev`;
const baseUrlBackendProduction = `https://${codename}.fly.dev`;

const config: AppConfig = {
  app: {
    holder: {
      name: "Marco Solari",
      email: "marcosolari@gmail.com",
    },
    api: {
      prefix: 'api',
      version: 'v1',
      timeoutSeconds: (process.env.NODE_ENV === 'development') ? 5 : 15, // TODO: use 7 or 10 in case of production-pro (fly.io pro plan), 15 for free plan, with host shut down soon,,,
      headers: {
        'Content-Type': 'application/json',
      }
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
    codename: codename,
    name: name,
    baseUrlBackend:
      (process.env.NODE_ENV === 'production') ? baseUrlBackendProduction :
      (process.env.NODE_ENV === 'staging') ? baseUrlBackendStaging :
      baseUrlBackendDevelopment
    ,
    baseUrlFrontend:
      (process.env.NODE_ENV === 'production') ? baseUrlFrontendProduction :
      (process.env.NODE_ENV === 'staging') ? baseUrlFrontendStaging :
      baseUrlFrontendDevelopment
    ,
    baseUrlProduction: baseUrlFrontendProduction,
    baseUrlStaging: baseUrlFrontendStaging,
    baseUrlBackendDevelopment,
    baseUrlFrontendDevelopment,
    languages: {
      en: { name: 'English', flag: '🇬🇧' },
      it: { name: 'Italiano', flag: '🇮🇹' },
      fr: { name: 'Français', flag: '🇫🇷' },
      zh: { name: 'Chinese', flag: '🇨🇳' },
    },
    defaultLanguage: 'it',
    defaultCountry: 'it',
    defaultTimezone: 'Europe/Rome',
    defaultPhonePrefix: '+39',
    currencies: {
      EUR: { symbol: '€', name: 'Euro' },
      USD: { symbol: '$', name: 'US Dollar' },
      GBP: { symbol: '£', name: 'British Pound' },
      JPY: { symbol: '¥', name: 'Japanese Yen' },
    },
    defaultCurrency: 'EUR' as CurrencyCode,
    theme: {
      defaultType: 'native',
      defaultMode: 'system', // system / light / dark
    },
    consent: {
      version: "1.0.0",
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
        qrcode: {
        },
        format: 'A4',
        nominal: false, // to set this to true we must beforehand
                        // implement the attendees name request when booking
      },
      purchases: {
        gateways: {
          'free': {}, // no payment requested
          'stripe': {} // Stripe gateway
        },
        gateway: 'free',
      }
    },
    images: {
      uploadFolder: '/uploads',
    },
  },
  server: {
  },
  slack: {
    webhookUrl: 'https://hooks.slack.com/services',
  },
};

export type CurrencyCode = keyof typeof config.app.currencies;

export default config;
