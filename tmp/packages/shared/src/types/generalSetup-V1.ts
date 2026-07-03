// ── Per-section shapes ──────────────────────────────────────────
export interface AppSetup {
  currency: string;
  timeout: number;
}

export interface PreferencesSetup {
  enableNotifications: boolean;
  launchDate: string | null;
  time: string | null;
}

export interface SecuritySetup {
  apiKey: string;
}

export type PaymentGateway = 'stripe' | 'satispay' | 'revolut' | 'paypal' | 'sumup' | 'cash' | 'free';

export type StripeConnectStatus = 'none' | 'pending' | 'active' | 'disabled';

export interface StripeConnectSetup {
  accountId: string | null;       // Stripe connected account id (acct_…)
  status: StripeConnectStatus;    // derived from the Stripe account state
  onboardingCompleted: boolean;   // Stripe details_submitted
  chargesEnabled: boolean;        // Stripe charges_enabled — true ⇒ checkout will work
  organizerEmail: string | null;
  businessName: string | null;
}

export interface PaymentsSetup {
  enabled: boolean;
  gateway: PaymentGateway;
  stripe?: StripeConnectSetup;    // platform organizer Connect account (one per deployment)
  // stripePublicKey: string;
  // stripeSecretKey: string;
  // revolutApiKey: string;
}

// ── Root shape ──────────────────────────────────────────────────
export interface GeneralSetupType {
  app: AppSetup;
  preferences: PreferencesSetup;
  security: SecuritySetup;
  payments: PaymentsSetup;
}

// Derive section keys from the shape itself — stays in sync automatically
export type GeneralSetupSections = keyof GeneralSetupType;

// Utility for partial deep saves
export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };