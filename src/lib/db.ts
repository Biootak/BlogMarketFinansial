import { PrismaClient } from '@prisma/client';
import { buildDatabaseUrl } from './db-url';
import { serverLog } from './server-logger';

export { buildDatabaseUrl };

// 2026-06-29: Prisma connection pool tuning
// ---------------------------------------------------------------------------
// The default Prisma pool (connection_limit=21, pool_timeout=10s) collapses
// during Next.js static generation because many workers open connections at
// the same time. We now build the query URL from DATABASE_URL and append
// configurable connection_limit / pool_timeout values via env vars:
//   PRISMA_CONNECTION_LIMIT  (default: 30 prod / 10 dev)
//   PRISMA_POOL_TIMEOUT      (default: 30 seconds)
// Existing query params in DATABASE_URL are preserved.

// 2026-06-30: Lazy singleton via Proxy
// ---------------------------------------------------------------------------
// Previously the PrismaClient was created when this module was imported. If
// DATABASE_URL was missing, the entire module graph threw before any caller
// could fall back (e.g. site-identity.ts). Now creation is deferred until the
// first property access, so pages/components that don't touch the DB import
// cleanly and DB consumers get the error exactly when they try to query.
const createPrismaClient = () =>
  new PrismaClient({
    datasources: {
      db: {
        url: buildDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

type PrismaClientType = ReturnType<typeof createPrismaClient>;

// biome-ignore lint/suspicious/noShadowRestrictedNames: <explanation>
declare const globalThis: {
  prismaGlobal: PrismaClientType | undefined;
} & typeof global;

function getPrismaClient(): PrismaClientType {
  if (!globalThis.prismaGlobal) {
    globalThis.prismaGlobal = createPrismaClient();
  }
  return globalThis.prismaGlobal;
}

const prisma = new Proxy({} as PrismaClientType, {
  get(_, prop) {
    const client = getPrismaClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];

    if (typeof value === 'function') {
      return value.bind(client);
    }

    return value;
  },
}) as PrismaClientType;

export default prisma;

// Helper function برای چک کردن اتصال دیتابیس
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    serverLog.error('db', 'check-connection', error);
    return false;
  }
}

// Helper برای اجرای query با retry
export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError;
}
