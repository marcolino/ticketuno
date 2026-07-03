import { ThemeType, ThemePreference } from './theme';
import type { PaymentGateway } from '@ticketuno/shared';

//export type PaymentGateway = 'free' | 'cash' | 'stripe';

export type TicketFormat = 'A4' | 'A5' | 'A6' | 'A7' | 'A8' | 'A9' | 'A10';

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
    email: {
      bulk: {
        preview: {
          UserName: string;
          UserSurname: string;
          UserEmail: string;
        },
      },
    },
    codename: string;
    name: string;
    baseUrlBackend: string;
    baseUrlFrontend: string;
    baseUrlProduction: string;
    baseUrlStaging: string;
    baseUrlBackendDevelopment: string;
    baseUrlFrontendDevelopment: string;
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
        gateways: [PaymentGateway];
        gateway: PaymentGateway;
      };
    };
    images: {
      uploadFolder: string;
    };
  };
  server: {
    [key: string]: number;
  },
  slack: {
    webhookUrl: string;
  },
  uploads: {
    path: string;
    allowedMimeTypes: [string];
    allowedMimeNames: ['JPEG', 'PNG', 'WEBP', 'GIF'];
    allowedTypes: ['poster', 'website', 'profile', 'banner', 'thumbnail'],
    sizeLimit: {
      value: number;
      description: string;
    },
  },
}
