function getDefaultConnectionLimit(): string {
  return process.env.NODE_ENV === 'production' ? '30' : '10';
}

export function buildDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const url = new URL(databaseUrl);

  if (!url.searchParams.has('connection_limit')) {
    const connectionLimit =
      process.env.PRISMA_CONNECTION_LIMIT ?? getDefaultConnectionLimit();
    url.searchParams.set('connection_limit', connectionLimit);
  }

  if (!url.searchParams.has('pool_timeout')) {
    const poolTimeout = process.env.PRISMA_POOL_TIMEOUT ?? '30';
    url.searchParams.set('pool_timeout', poolTimeout);
  }

  return url.toString();
}
