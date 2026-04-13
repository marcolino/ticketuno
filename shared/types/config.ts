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
    holder: {
      name: string; // Legal name of the person or entity operating the service (shown in legal pages)
      email: string; // Contact / privacy e-mail address (shown in legal pages as a mailto link)
    },
    api: {
      prefix: string;
      version: string;
      timeoutSeconds: number;
      headers: {};
    };
    auth: {
      tokenExpirationTimeWarningAdvanceSeconds: number;
    };
    codename: string;
    name: string;
    baseUrlBackend: string;
    baseUrlFrontend: string;
    baseUrlProduction: string;
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
  },
}
