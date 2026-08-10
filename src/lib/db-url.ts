/**
 * Build the Prisma query URL with configurable pool settings.
 *
 * Rules:
 * - Reads DATABASE_URL as the base URL.
 * - Auto-detects Supabase hosts (db.xxx.supabase.co) and switches the port from
 *   5432 (session-mode PgBouncer, max 15 conns on free tier) to 6543
 *   (transaction-mode PgBouncer, no hard limit). Transaction mode is the
 *   recommended Supabase setting for serverless/Next.js apps.
 *   Override with PRISMA_FORCE_PORT env var, or set the port directly in DATABASE_URL.
 * - Adds `connection_limit` from PRISMA_CONNECTION_LIMIT if not already set.
 *   Defaults: 3 in production, 1 in development (see CONNECTION BUDGET below).
 * - Adds `pool_timeout` from PRISMA_POOL_TIMEOUT if not already set. Default: 8s.
 * - Adds `connect_timeout` from PRISMA_CONNECT_TIMEOUT if not already set. Default: 8s
 *   (fail-fast — an unreachable DB errors quickly instead of hanging 30+ s).
 * - Preserves any existing query parameters from DATABASE_URL.
 *
 * ── CONNECTION BUDGET (چرا dev باید ۱ بماند) ────────────────────────────────
 * Prisma's connection_limit is PER CLIENT. In Next.js dev, Turbopack spawns one
 * RSC worker per CPU core and every worker holds its OWN Prisma singleton (the
 * globalThis guard in db.ts is per-worker), so the connections the app actually
 * opens are:  workers × connection_limit.
 *
 * The dev database (AWS RDS, role `u2ch9n0ouvoq50`) is capped SERVER-SIDE at
 * rolconnlimit = 20 — at most 20 concurrent connections for the role, no matter
 * what this file asks for. On a many-core dev machine (10+ workers) even
 * connection_limit = 2 blows past the cap and PostgreSQL rejects new connections
 * with `FATAL: too many connections for role` (Prisma surfaces it as P1001
 * "Can't reach database server").
 *
 * That cap lives ON THE DATABASE SERVER, not in this repo: raising it requires
 * `ALTER ROLE u2ch9n0ouvoq50 CONNECTION LIMIT <n>` run by the RDS master user.
 * Until then, dev MUST keep connection_limit = 1. .env.local pins
 * PRISMA_CONNECTION_LIMIT="1" to override the legacy value in .env (dev default
 * was 10 in commit 312e9c3c — exactly what exhausted the 20-cap).
 *
 * This keeps the migration/directUrl config untouched; it only affects the
 * runtime/query connection URL passed to PrismaClient.
 */
function getDefaultConnectionLimit(): string {
  // Why 1 in dev: connection_limit is per Prisma client, and dev spawns one
  // client per Turbopack worker → total = workers × limit. With the RDS role
  // capped at 20 (see header), limit=1 keeps the whole dev server under the cap
  // even on 16-core machines; limit=2+ is only safe after rolconnlimit is
  // raised server-side. Production runs as a single dyno against its own
  // Heroku Postgres pool, so 3 is fine there.
  return process.env.NODE_ENV === 'production' ? '3' : '1';
}

function isSupabaseHost(hostname: string): boolean {
  // Supabase uses multiple host patterns:
  //   db.xxx.supabase.co          (direct connection)
  //   xxx.pooler.supabase.com     (connection pooler)
  //   aws-0-eu-west-1.pooler.supabase.com  (region-specific pooler)
  return hostname.endsWith('.supabase.co') || hostname.endsWith('.supabase.com');
}

export function buildDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
        'Copy .env.example to .env and configure a valid PostgreSQL connection string.',
    );
  }

  const url = new URL(databaseUrl);

  // Supabase: auto-switch from session-mode (5432) to transaction-mode (6543)
  // Transaction mode handles concurrent workers without hitting the 15-conn limit.
  if (isSupabaseHost(url.hostname) && !process.env.PRISMA_FORCE_PORT) {
    const currentPort = Number.parseInt(url.port, 10) || 5432;
    if (currentPort === 5432) {
      url.port = '6543';
    }
  }

  // When using transaction-mode pooler (port 6543), Prisma MUST disable prepared
  // statements via ?pgbouncer=true. In transaction mode, the pooler may route each
  // query to a DIFFERENT backend connection; prepared statements are stateful per
  // connection and cause 'Prepared statement "s0" already exists' errors.
  // See: https://www.prisma.io/docs/guides/performance-and-optimization/connection-management/configure-pg-bouncer
  // NOTE: checking the port directly (not whether WE auto-switched) catches
  // the case where DATABASE_URL already had port 6543 explicitly set.
  if (url.port === '6543' && !url.searchParams.has('pgbouncer')) {
    url.searchParams.set('pgbouncer', 'true');
  }

  // Only override if the operator has not already set the value in DATABASE_URL.
  // ⚠️ PRISMA_CONNECTION_LIMIT must respect the server-side role cap (RDS
  // rolconnlimit=20): values ≥2 in dev exhaust the cap once multiple workers
  // open pools. .env.local pins it to 1 for dev on purpose.
  if (!url.searchParams.has('connection_limit')) {
    const connectionLimit = process.env.PRISMA_CONNECTION_LIMIT ?? getDefaultConnectionLimit();
    url.searchParams.set('connection_limit', connectionLimit);
  }

  if (!url.searchParams.has('pool_timeout')) {
    const poolTimeout = process.env.PRISMA_POOL_TIMEOUT ?? '8';
    url.searchParams.set('pool_timeout', poolTimeout);
  }

  // 2026-08-09: fail-fast — اگر DB دور/قطع باشد، درخواست باید سریع خطا بدهد
  // نه اینکه ۳۰+ ثانیه hang کند (وبهوک تلگرام را بلاک می‌کرد).
  // قابل override با PRISMA_CONNECT_TIMEOUT.
  if (!url.searchParams.has('connect_timeout')) {
    const connectTimeout = process.env.PRISMA_CONNECT_TIMEOUT ?? '8';
    url.searchParams.set('connect_timeout', connectTimeout);
  }

  return url.toString();
}
