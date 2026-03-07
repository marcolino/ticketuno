import { ThemeType, ThemePreference } from './theme';

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
    // apiHost: string;
    // apiBasePath: string;
    // apiVersion: string;
    baseUrl: string;
    languages: Record<string, AppLanguage>;
    defaultLanguage: string;
    // currencies: Record<CurrencyCode, Currency>;
    // defaultCurrency: CurrencyCode;
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
      purchases: {
        gateways: Record<string, Record<string, unknown>>;
        gateway: string;
      };
    };
  };
  server: {
    [key: string]: number;
  };
}
