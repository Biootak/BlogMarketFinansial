/**
 * Build the Prisma query URL with configurable pool settings.
 *
 * Rules:
 * - Reads DATABASE_URL as the base URL.
 * - Adds `connection_limit` from PRISMA_CONNECTION_LIMIT if not already set.
 *   Defaults: 30 in production, 10 in development (local dev rarely needs 30).
 * - Adds `pool_timeout` from PRISMA_POOL_TIMEOUT if not already set.
 *   Default: 30 seconds (10s is too low under SSG load).
 * - Preserves any existing query parameters from DATABASE_URL.
 *
 * This keeps the migration/directUrl config untouched; it only affects the
 * runtime/query connection URL passed to PrismaClient.
 */
function getDefaultConnectionLimit(): string {
  // Supabase session-mode pooler (port 5432) limits concurrent sessions to 15
  // on the free/small tier. In dev a single Next.js process with connection_limit=10
  // easily saturates that, causing EMAXCONNSESSION. Keep dev to 3 to leave headroom
  // for the Prisma shadow DB, migrations, and any other tools hitting the same pooler.
  // Production keeps 10 (not 30) for the same reason — Prisma's pool multiplies by
  // worker count under load.
  return process.env.NODE_ENV === 'production' ? '10' : '3';
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

  // Only override if the operator has not already set the value in DATABASE_URL.
  if (!url.searchParams.has('connection_limit')) {
    const connectionLimit = process.env.PRISMA_CONNECTION_LIMIT ?? getDefaultConnectionLimit();
    url.searchParams.set('connection_limit', connectionLimit);
  }

  if (!url.searchParams.has('pool_timeout')) {
    const poolTimeout = process.env.PRISMA_POOL_TIMEOUT ?? '30';
    url.searchParams.set('pool_timeout', poolTimeout);
  }

  return url.toString();
}
