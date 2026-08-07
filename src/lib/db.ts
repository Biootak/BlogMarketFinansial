import { PrismaClient } from '@prisma/client';
import { buildDatabaseUrl } from './db-url';
import { serverLog } from './server-logger';

export { buildDatabaseUrl };

// Lazy singleton via Proxy — defers PrismaClient creation to first use so
// missing DATABASE_URL doesn't crash the entire module graph at import time.
// Pool tuning via PRISMA_CONNECTION_LIMIT / PRISMA_POOL_TIMEOUT env vars.
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

// biome-ignore lint/suspicious/noShadowRestrictedNames: redeclaring globalThis is the standard Next.js pattern for Prisma singleton across hot-reload
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
    // Add timeout to prevent hanging on connection issues
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout')), 5000),
    );
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeoutPromise]);
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
