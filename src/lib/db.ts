import { PrismaClient } from '@prisma/client';
import { buildDatabaseUrl } from './db-url';

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
const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: buildDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
};

// biome-ignore lint/suspicious/noShadowRestrictedNames: <explanation>
declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;

// Helper function برای چک کردن اتصال دیتابیس
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    console.error('[Database] Connection failed');
    return false;
  }
}

// Helper برای اجرای query با retry
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
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
