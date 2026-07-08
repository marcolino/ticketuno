import { AsyncLocalStorage } from 'async_hooks';
import { Database } from '../db/database';

export interface TenantCtx {
  slug: string;
  db: Database;
}

export const tenantContext = new AsyncLocalStorage<TenantCtx>();

export function runWithTenant<T>(ctx: TenantCtx, fn: () => T): T {
  return tenantContext.run(ctx, fn);
}

export function getCurrentTenantSlug(): string {
  const ctx = tenantContext.getStore();
  if (!ctx) throw new Error('No tenant context active — this code path must run inside runWithTenant().');
  return ctx.slug;
}
