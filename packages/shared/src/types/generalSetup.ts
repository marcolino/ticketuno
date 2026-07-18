import { CurrencyCode } from '../config';

// ── Types ──────────────────────────────────────────────────────────────

export type PaymentGateway = 'stripe' | 'satispay' | 'revolut' | 'paypal' | 'sumup' | 'cash' | 'free';

export type StripeMode = 'test' | 'live';
export type StripeConnectStatus = 'none' | 'pending' | 'active' | 'disabled' | 'error';

export interface StripeConnectSetup {
  status: StripeConnectStatus;
  organizerEmail: string | null;
  businessName: string | null;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardingCompleted: boolean;  
  onboardingUrl?: string | null;
  error?: string | null;
}

export interface GeneralSetupType {
  app: {
    currency: CurrencyCode;
    //timeout: number;
    timezone: string;
  };
  branding: {
    logoImage: string | null;
  };
  // preferences: {
  //   enableNotifications: boolean;
  //   launchDate: string | null;
  //   time: string | null;
  // };
  // security: {
  //   apiKey: string;
  // };
  payments: {
    enabled: boolean;
    gateway: PaymentGateway | null;
    stripe: StripeConnectSetup;
  };
}

// ── Section names ──────────────────────────────────────────────────────

export type GeneralSetupSections = keyof GeneralSetupType;

// ── DeepPartial helper ─────────────────────────────────────────────────

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ── Default values ─────────────────────────────────────────────────────

export const defaultGeneralSetup: GeneralSetupType = {
  app: {
    currency: 'EUR' as CurrencyCode,
    //timeout: 10,
    timezone: 'Europe/Rome',
  },
  branding: { logoImage: null },
  // preferences: {
  //   enableNotifications: true,
  //   launchDate: null,
  //   time: null,
  // },
  // security: {
  //   apiKey: '',
  // },
  payments: {
    enabled: false,
    gateway: 'stripe',
    stripe: {
      accountId: null,
      status: 'none',
      onboardingCompleted: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      organizerEmail: null,
      businessName: null,
    },
  },
};
