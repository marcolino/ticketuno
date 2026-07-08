import path from 'path';
import config from '../config';
import { Database } from '../db/database';
import { tenantRegistry } from './tenantRegistry';
import { runWithTenant } from './tenantContext';
import { primeSetupCache } from '../services/setupService';

const SLUG_RE = /^[a-z0-9-]{1,63}$/;

function assertValidSlug(slug: string): void {
  if (!SLUG_RE.test(slug)) {
    throw new Error(`Refusing to build a DB path for invalid tenant slug: ${JSON.stringify(slug)}`);
  }
}

class TenantDbManager { 
  private dbs = new Map<string, Database>();

  private tenantDbPath(slug: string): string {
    assertValidSlug(slug);
    const baseDir = path.dirname(config.db.dataRoot); // e.g. /data (or ./data locally)
    return path.join(baseDir, slug, config.db.name);
  }

  async getTenantDb(slug: string): Promise<Database> {
    const existing = this.dbs.get(slug);
    if (existing) return existing;
    return this.createTenantDb(slug);
  }

  private async createTenantDb(slug: string): Promise<Database> {
    console.log(`Initializing tenant DB: ${slug} -> ${this.tenantDbPath(slug)}`);
    const db = new Database();
    await db.initialize(this.tenantDbPath(slug), slug);
    this.dbs.set(slug, db);

    // Prime the setup cache and Stripe account index for this tenant, inside
    // its own tenant context, so the very first real request is warm.
    await runWithTenant({ slug, db }, async () => {
      try {
        const setup = await db.loadSetup();
        if (setup) {
          await primeSetupCache(slug, setup);
          const accountId = setup.payments?.stripe?.accountId;
          if (accountId) tenantRegistry.indexStripeAccountId(slug, accountId);
        }
      } catch (err) {
        console.error(`Could not prime setup/Stripe index for tenant "${slug}":`, err);
      }
    });
    
    return db;
  }

  /** Called once at boot: pre-initializes every known tenant so migrations run before traffic is served. */
  async initializeAllTenants(): Promise<void> {
    const slugs = tenantRegistry.getAllSlugs();
    for (const slug of slugs) {
      await this.createTenantDb(slug);
    }
  }

  /** For cron/reminder jobs that must iterate every tenant. */
  getAllTenantSlugs(): string[] {
    return [...this.dbs.keys()];
  }

  getDbSync(slug: string): Database | undefined {
    return this.dbs.get(slug);
  }
}

export const tenantDbManager = new TenantDbManager();
