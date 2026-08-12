/**
 * edge-maintenance — maintenance-mode check for Edge Runtime (middleware)
 * ----------------------------------------------------------------------------
 * Uses Upstash Redis REST (HTTP-based, edge-safe) to share the maintenance
 * flag between the settings page (server action) and the middleware.
 *
 * Graceful degradation: if Redis env vars are unset or the request fails,
 * `isMaintenanceActive()` returns `false` (site stays up).
 *
 * 2026-08-12 perf: the flag used to be re-read from Redis on EVERY request —
 * middleware runs on '/((?!...).*)' (all HTML + API routes), so each public
 * page load paid one HTTPS round-trip to Upstash on the critical path before
 * any guard could run. Now reads are memoized in-process for a few seconds:
 * the middleware hot path is a memory read, Redis is polled at most once per
 * TTL, and `setMaintenanceMode` mirrors the new value immediately so the
 * toggle is instant on the instance that flipped it (other instances pick it
 * up on the next TTL-bound poll).
 */

import { Redis } from '@upstash/redis';

const KEY = 'system:maintenanceMode';

// 2026-08-12: how long a read stays fresh. Kept small so a maintenance toggle
// from another server instance propagates quickly, while still collapsing the
// per-request Redis GETs into one poll per window.
const CACHE_TTL_MS = 3_000;

let cachedValue: boolean | null = null;
let cacheExpiresAt = 0;
let inflight: Promise<boolean> | null = null;

function getRedis(): Redis | undefined {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return undefined;
  return new Redis({
    url,
    token,
    automaticDeserialization: false,
    // 2026-08-12 — داک رسمی Upstash (Request Timeout): سقف هر فراخوانی، تا
    // middleware هرگز روی شبکهٔ پر-latency آویزان نماند (کش ۳ ثانیه‌ای فرکانس
    // را کم می‌کند؛ این سقف هر فراخوانی را باند می‌کند).
    signal: () => AbortSignal.timeout(1000),
  });
}

/**
 * Write the maintenance flag to Redis.
 * Called from the settings toggle action (server-side, not edge).
 */
export async function setMaintenanceMode(active: boolean): Promise<void> {
  // Mirror into the local cache first — if this action and the middleware
  // share the same process (single-instance self-host), the very next request
  // already sees the new state without waiting for a Redis poll.
  cachedValue = active;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
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
 * Read the maintenance flag from Redis (memoized in-process).
 * Called from middleware (edge runtime); returns `false` on any failure so
 * the site never goes down due to a Redis hiccup.
 */
export async function isMaintenanceActive(): Promise<boolean> {
  const now = Date.now();
  if (cachedValue !== null && now < cacheExpiresAt) return cachedValue;

  const r = getRedis();
  if (!r) {
    cachedValue = false;
    cacheExpiresAt = now + CACHE_TTL_MS;
    return false;
  }

  // Single-flight: overlapping requests share one GET instead of stacking
  // parallel round-trips on a cold cache.
  if (!inflight) {
    inflight = (async () => {
      try {
        const val = await r.get(KEY);
        return val === '1';
      } catch {
        return false;
      }
    })().finally(() => {
      inflight = null;
    });
  }

  cachedValue = await inflight;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return cachedValue;
}
