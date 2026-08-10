/**
 * edge-maintenance — maintenance-mode check for Edge Runtime (middleware)
 * ----------------------------------------------------------------------------
 * Uses Upstash Redis REST (HTTP-based, edge-safe) to share the maintenance
 * flag between the settings page (server action) and the middleware.
 *
 * Graceful degradation: if Redis env vars are unset or the request fails,
 * `isMaintenanceActive()` returns `false` (site stays up).
 */

import { Redis } from '@upstash/redis';

const KEY = 'system:maintenanceMode';

function getRedis(): Redis | undefined {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return undefined;
  return new Redis({ url, token, automaticDeserialization: false });
}

/**
 * Write the maintenance flag to Redis.
 * Called from the settings toggle action (server-side, not edge).
 */
export async function setMaintenanceMode(active: boolean): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    if (active) {
      await r.set(KEY, '1');
    } else {
      await r.del(KEY);
    }
  } catch {
    // Redis unavailable — maintenance toggle falls back to DB-only
  }
}

/**
 * Read the maintenance flag from Redis.
 * Called from middleware (edge runtime); returns `false` on any failure so
 * the site never goes down due to a Redis hiccup.
 */
export async function isMaintenanceActive(): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;
  try {
    const val = await r.get(KEY);
    return val === '1';
  } catch {
    return false;
  }
}
