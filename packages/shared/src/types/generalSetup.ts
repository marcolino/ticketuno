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

export type PaymentGateway = 'stripe' | 'revolut' | 'paypal' | 'sumup';

export interface PaymentsSetup {
  enabled: boolean;
  gateway: PaymentGateway | null;
  stripePublicKey: string;
  stripeSecretKey: string;
  revolutApiKey: string;
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