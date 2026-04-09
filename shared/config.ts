import type { AppConfig } from './types/config';

const name = 'TicketUno';
const codename = 'ticketuno';

const config: AppConfig = {
  app: {
    api: {
      prefix: 'api',
      version: 'v1',
    },
    auth: {
      tokenExpirationTimeWarningAdvanceSeconds: 5 * 60,
    },
    codename: codename,
    name: name,
    baseUrlBackend: (process.env.NODE_ENV === 'production') ?
      `https://${codename}.fly.dev` :
      'http://localhost:3001'
    ,
    baseUrlFrontend: (process.env.NODE_ENV === 'production') ?
      `https://${codename}.fly.dev` :
      'http://localhost:3000'
    ,
    baseUrlProduction: `https://${codename}.fly.dev`,
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
        nominal: false, // to set to true must be implemented the attendees name request when booking...
      },
      purchases: {
        gateways: {
          'free': {}, // no payment requested
          'stripe': {} // TODO ...
        },
        gateway: 'free',
      }
    }
  },
  server: {
    //delayMilliseconds: 3 * 1000,
  },
  slack: {
    webhookUrl: 'https://hooks.slack.com/services',
  }
};

export type CurrencyCode = keyof typeof config.app.currencies;

export default config;
