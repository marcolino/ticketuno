import { database } from '../db/database';
import { tenantRegistry } from '../tenancy/tenantRegistry';
import { tenantDbManager } from '../tenancy/tenantDbManager';
import { runWithTenant } from '../tenancy/tenantContext';
import config from '../config';

//const STALE_BOOKING_CUTOFF_MINUTES = 30; // matches the 30-min seat reservation window (TODO: to config)

async function releaseExpiredPendingBookingsOnce(): Promise<{ expired: number }> {
  const { expiredCount, bookingIds } = await database.releaseExpiredPendingBookings(config.bookings.staleCutoffMinutes);

  if (expiredCount > 0) {
    console.log(`[releaseExpiredBookingsJob] Released ${expiredCount} stale booking(s): ${bookingIds.join(', ')}`);
  }

  return { expired: expiredCount };
}

export async function runReleaseExpiredBookingsJob(): Promise<{ slug: string; expired: number }[]> {
  const results = [];
  for (const slug of tenantRegistry.getAllSlugs()) {
    const db = await tenantDbManager.getTenantDb(slug);
    const result = await runWithTenant({ slug, db }, () => releaseExpiredPendingBookingsOnce());
    results.push({ slug, ...result });
  }
  return results;
}
