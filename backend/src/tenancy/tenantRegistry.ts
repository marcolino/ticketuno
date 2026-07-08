import { promises as fs } from 'fs';
import path from 'path';
import config from '../config';

export interface TenantEntry {
  slug: string;
  domains: string[];               // custom domains AND/OR subdomains — same mechanism
  status: 'active' | 'suspended';
  stripeAccountId?: string | null; // set once organizer completes Connect onboarding
}

interface TenantRegistryFile {
  tenants: TenantEntry[];
}

const SLUG_RE = /^[a-z0-9-]{1,63}$/;

class TenantRegistry {
  private tenants: TenantEntry[] = [];
  private domainToSlug = new Map<string, string>();
  private accountIdToSlug = new Map<string, string>();

  // /data/tenants.json — sits next to the per-tenant folders
  private registryPath = path.join(path.dirname(config.db.path), 'tenants.json');

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.registryPath, 'utf8');
      const parsed = JSON.parse(raw) as TenantRegistryFile;
      this.tenants = (parsed.tenants || []).filter(t => this.validate(t));
    } catch (err) {
      console.error(`Could not load tenant registry at ${this.registryPath}:`, err);
      this.tenants = [];
    }
    this.rebuildIndex();
    console.log(`Loaded ${this.tenants.length} tenant(s): ${this.tenants.map(t => t.slug).join(', ') || '(none)'}`);
  }

  private validate(t: TenantEntry): boolean {
    if (!t || !SLUG_RE.test(t.slug)) {
      console.error(`Skipping tenant entry with invalid/missing slug: ${JSON.stringify(t?.slug)}`);
      return false;
    }
    if (!Array.isArray(t.domains) || t.domains.length === 0) {
      console.error(`Skipping tenant "${t.slug}": no domains configured`);
      return false;
    }
    return true;
  }

  private rebuildIndex(): void {
    this.domainToSlug.clear();
    for (const t of this.tenants) {
      for (const domain of t.domains) {
        this.domainToSlug.set(domain.toLowerCase(), t.slug);
      }
    }
  }

  /** Resolves a request hostname to a tenant slug. Returns null if unknown or suspended. */
  resolveSlugByDomain(hostname: string): string | null {
    const slug = this.domainToSlug.get(hostname.toLowerCase());
    if (!slug) return null;
    const entry = this.tenants.find(t => t.slug === slug);
    if (!entry || entry.status !== 'active') return null;
    return slug;
  }

  /**
   * Used by the Stripe webhook handler — webhooks arrive on a fixed platform host, not a tenant domain
   */
  resolveSlugByStripeAccountId(accountId: string): string | null {
    return this.accountIdToSlug.get(accountId) ?? null;
  }

  getAllSlugs(): string[] {
    return this.tenants.map(t => t.slug);
  }

  getEntry(slug: string): TenantEntry | undefined {
    return this.tenants.find(t => t.slug === slug);
  }

  async reload(): Promise<void> {
    await this.load();
  }

  /**
   * Called at boot (once per tenant) and again whenever a tenant's Stripe account id changes
   */
  indexStripeAccountId(slug: string, accountId: string | null | undefined): void {
    if (!accountId) return;
    this.accountIdToSlug.set(accountId, slug);
  }
}

export const tenantRegistry = new TenantRegistry();
