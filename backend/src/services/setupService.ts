import { database } from '../db/database';
import { GeneralSetupType, StripeConnectSetup } from '@ticketuno/shared';
import { getCurrentTenantSlug } from '../tenancy/tenantContext';
import { tenantRegistry } from '../tenancy/tenantRegistry';

//let cachedSetup: GeneralSetupType | null = null;
const cachedSetupByTenant = new Map<string, GeneralSetupType>();

export const loadSetup = async (): Promise<GeneralSetupType> => {
  const slug = getCurrentTenantSlug();
  const cached = cachedSetupByTenant.get(slug);
  if (cached) return cached;

  const setup = await database.loadSetup();
  if (!setup) {
    throw new Error(`Setup not found for tenant "${slug}"`);
  }
  cachedSetupByTenant.set(slug, setup);
  return setup;
};

export const refreshSetup = async () => {
  // const setup = await database.loadSetup();
  // if (!setup) {
  //   throw new Error("Setup not found");
  // }
  // cachedSetup = setup;
  // return cachedSetup;
  const slug = getCurrentTenantSlug();
  const setup = await database.loadSetup();
  if (!setup) {
    throw new Error(`Setup not found for tenant "${slug}"`);
  }
  cachedSetupByTenant.set(slug, setup);
  return setup;
};

export const getSetup = (): GeneralSetupType => {
  const slug = getCurrentTenantSlug();
  const cached = cachedSetupByTenant.get(slug);
  if (!cached) {
    throw new Error(`Setup not loaded yet for tenant "${slug}"`);
  }
  return cached;
};

/**
 * Called once per tenant at boot, from tenantDbManager.createTenantDb(),
 * so the cache is warm before the first real request for that tenant arrives.
 * Not meant to be called from request-handling code.
 */
export const primeSetupCache = async (slug: string, setup: GeneralSetupType): Promise<void> => {
  cachedSetupByTenant.set(slug, setup);
};

// ── Stripe Connect (per-tenant organizer account) ─────────────────
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
  const slug = getCurrentTenantSlug();
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

  // Keep the boot-time accountId → tenant index (used by the webhook route)
  // in sync whenever onboarding sets or changes the connected account id.
  const accountId = merged.payments?.stripe?.accountId;
  if (accountId) tenantRegistry.indexStripeAccountId(slug, accountId);
  
  return readStripeConnect(getSetup());
};
