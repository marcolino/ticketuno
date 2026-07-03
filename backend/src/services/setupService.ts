import { database } from '../db/database';
import { GeneralSetupType, StripeConnectSetup } from '@ticketuno/shared';

let cachedSetup: GeneralSetupType | null = null;

export const loadSetup = async () => {
  if (!cachedSetup) {
    const setup = await database.loadSetup();
    if (!setup) {
      throw new Error("Setup not found");
    }
    cachedSetup = setup;
  }
  return cachedSetup;
};

export const refreshSetup = async () => {
  const setup = await database.loadSetup();
  if (!setup) {
    throw new Error("Setup not found");
  }
  cachedSetup = setup;
  return cachedSetup;
};

export const getSetup = () => {
  if (!cachedSetup) {
    throw new Error("Setup not loaded yet");
  }
  return cachedSetup;
};

// ── Stripe Connect (platform organizer account) ─────────────────
const DEFAULT_STRIPE_CONNECT: StripeConnectSetup = {
  accountId: null,
  status: 'none',
  payoutsEnabled: false,
  detailsSubmitted: false,   
  onboardingCompleted: false,
  chargesEnabled: false,
  organizerEmail: null,
  businessName: null,
};

/** Reads the organizer Stripe Connect block from a setup, filling defaults
 *  (older saved setups predate this field). */
export const readStripeConnect = (setup: GeneralSetupType): StripeConnectSetup => ({
  ...DEFAULT_STRIPE_CONNECT,
  ...(setup.payments?.stripe ?? {}),
});

/** Merges a partial update into payments.stripe, persists it, and refreshes
 *  the cache. Returns the updated block. */
export const updateStripeConnect = async (
  patch: Partial<StripeConnectSetup>,
): Promise<StripeConnectSetup> => {
  const current = await loadSetup();
  const merged: GeneralSetupType = {
    ...current,
    payments: {
      ...current.payments,
      stripe: { ...readStripeConnect(current), ...patch },
    },
  };
  await database.saveSetup(merged);
  await refreshSetup();
  return readStripeConnect(getSetup());
};
