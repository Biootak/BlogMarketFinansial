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
  // on the free/small tier. In dev a single Next.js process can easily saturate
  // that because Turbopack spawns multiple RSC workers, each holding its own
  // Prisma singleton. Keep dev at 1 so the entire Next.js process never occupies
  // more than 1 connection, leaving ample headroom for migrations, prisma studio,
  // and any parallel tooling. Production keeps 5 (not 10) for the same reason.
  return process.env.NODE_ENV === 'production' ? '5' : '1';
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
