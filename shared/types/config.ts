import { ThemeType, ThemePreference } from './theme';

export type TicketFormat = 'A4' | 'A3'; // ...

export interface AppLanguage {
  name: string;
  flag: string;
}

export interface Currency {
  symbol: string;
  name: string;
}

export type CurrencyCode = string;

export interface AppConfig {
  app: {
    codename: string;
    name: string;
    baseUrl: string;
    languages: Record<string, AppLanguage>;
    defaultLanguage: string;
    defaultCountry: string;
    defaultTimezone: string;
    defaultPhonePrefix: string;
    currencies: Record<CurrencyCode, Currency>;
    defaultCurrency: CurrencyCode;
    theme: {
      defaultType: ThemeType;
      defaultMode: ThemePreference;
    };
    consent: {
      version: string;
      cookies: {
        technical: true;
        analytics: boolean;
        marketing: boolean;
      },
      communication: {
        marketingEmails: boolean;
        pushNotifications: boolean;
      },
    },
    reservations: {
      ticketing: {
        useQrcode: boolean;
        qrcode: {
        },
        format: TicketFormat;
        nominal: false,
      },
      purchases: {
        gateways: Record<string, Record<string, unknown>>;
        gateway: string;
      };
    };
  };
  server: {
    [key: string]: number;
  },
  slack: {
    webhookUrl: string,
  }
}
