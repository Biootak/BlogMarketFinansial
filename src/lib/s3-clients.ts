/**
 * s3-clients.ts — ساخت یک‌پارچهٔ clientهای S3 از پول باکت‌ها.
 * ────────────────────────────────────────────────────────────
 * نقطهٔ واحد ساخت `S3Client` برای همهٔ ماژول‌هایی که از پول باکت‌ها
 * استفاده می‌کنند (storage.ts برای آپلود تصاویر، backup.ts برای آینهٔ
 * backup) — تا کانفیگ S3 (endpoint/credentials/forcePathStyle/timeout)
 * فقط یک‌جا تعریف شود و env فقط یک بار پارس شود.
 *
 * `s3-pool.ts` deliberately خالص است (بدون aws-sdk / شبکه) — این ماژول
 * لایهٔ نازکی است که فقط client می‌سازد و همان تست‌پذیری را حفظ می‌کند:
 * `buildPoolFromEntries` بدون نیاز به env تست می‌شود.
 */

import { type S3PoolEntry, parseS3Pool } from '@/lib/s3-pool';
import { S3Client } from '@aws-sdk/client-s3';

export interface S3PoolMember {
  client: S3Client;
  bucket: string;
  endpoint: string;
}

export interface S3Timeouts {
  requestTimeout: number;
  connectionTimeout: number;
}

/**
 * Timeoutهای پیش‌فرض — تند و مناسب عملیات کاربر (آپلود تصاویر): ذخیره‌گاه
 * غیرقابل‌دسترس نباید آپلود را بند بیندازد (circuit breaker بقیهٔ کار را
 * می‌کند). ماژول‌های حساس به latency کمتر (مثل backup در پس‌زمینه) می‌توانند
 * timeout بزرگ‌تری پاس بدهند.
 */
export const DEFAULT_S3_TIMEOUTS: S3Timeouts = {
  requestTimeout: 2000,
  connectionTimeout: 3000,
};

/** ساخت یک client از یک entry پول — تنها جایی که S3Client ساخته می‌شود. */
export function buildS3Client(
  entry: S3PoolEntry,
  timeouts: S3Timeouts = DEFAULT_S3_TIMEOUTS,
): S3Client {
  return new S3Client({
    region: entry.region,
    endpoint: entry.endpoint,
    credentials: {
      accessKeyId: entry.accessKey,
      secretAccessKey: entry.secretKey,
    },
    forcePathStyle: true,
    maxAttempts: 1,
    requestHandler: timeouts,
  });
}

/** ساخت پول از entryهای آماده — خالص و قابل تست بدون env. */
export function buildPoolFromEntries(
  entries: S3PoolEntry[],
  timeouts: S3Timeouts = DEFAULT_S3_TIMEOUTS,
): S3PoolMember[] {
  return entries.map((entry) => ({
    client: buildS3Client(entry, timeouts),
    bucket: entry.bucket,
    endpoint: entry.endpoint,
  }));
}

/**
 * ساخت پول از env (پیش‌فرض process.env) — پول `S3_POOL` یا legacy تک‌باکتی
 * `S3_*`؛ اگر هیچ‌کدام نباشد [] (ذخیره‌سازی ابری غیرفعال).
 */
export function buildS3Pool(
  timeouts: S3Timeouts = DEFAULT_S3_TIMEOUTS,
  env: Record<string, string | undefined> = process.env,
): S3PoolMember[] {
  return buildPoolFromEntries(parseS3Pool(env), timeouts);
}
