import type { AppConfig } from './types/config';

const config: AppConfig = {
  app: {
    codename: 'ticketuno',
    name: 'TicketUno',
    // apiHost: '',
    // apiBasePath: '',
    // apiVersion: '',
    baseUrl: (process.env.NODE_ENV === 'production') ?
      'https://ticketuno.fly.dev' :
      'http://localhost:3000'
    ,
    languages: {
      en: { name: 'English', flag: '🇬🇧' },
      it: { name: 'Italiano', flag: '🇮🇹' },
      fr: { name: 'Français', flag: '🇫🇷' },
      zh: { name: 'Chinese', flag: '🇨🇳' },
    },
    defaultLanguage: 'it',
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
        useQrcode: false,
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
};

export type CurrencyCode = keyof typeof config.app.currencies;

export default config;
