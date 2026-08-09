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
 *   Defaults: 3 in production, 1 in development (Turbopack workers multiply).
 * - Adds `pool_timeout` from PRISMA_POOL_TIMEOUT if not already set.
 *   Default: 30 seconds.
 * - Preserves any existing query parameters from DATABASE_URL.
 *
 * This keeps the migration/directUrl config untouched; it only affects the
 * runtime/query connection URL passed to PrismaClient.
 */
function getDefaultConnectionLimit(): string {
  // Supabase transaction-mode pooler (port 6543) has no hard limit, but we still
  // keep a low connection_limit so Prisma doesn't open too many connections per
  // worker. In dev, Turbopack spawns multiple RSC workers, each holding its own
  // Prisma singleton — limit to 1 per worker to stay safe.
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
