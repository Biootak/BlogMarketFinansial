/**
 * high-value-queue.ts — صف زیرساختی تراکنش‌های پرمقدار
 * ----------------------------------------------------------------------------
 * چرا: confirm انتقال/برداشت و پرداخت تسویه، پرمقدارترین عملیات مالی هستند.
 * atomic claim داخل خود تراکنش‌ها (PENDING→COMPLETED با updateMany شرطی) خطای
 * دوبار برداشت را می‌بندد، اما در نوسان شبکه (timeout پول اتصال DB) کاربر باید
 * دستی دوباره تلاش کند. این صف لایهٔ دوم دفاع است:
 *
 *   ۱. single-flight — unique (operation, targetId): دوبار confirm هم‌زمان فقط
 *      یک job می‌سازد (dedupe). job terminal شده (failed/dead) با درخواست جدید
 *      دوباره pending می‌شود تا کاربر بعد از رفع خطا (مثلاً شارژ موجودی) بتواند
 *      دوباره تلاش کند.
 *   ۲. FIFO ترتیب‌یافته — claim با FOR UPDATE SKIP LOCKED به ترتیب createdAt؛
 *      چند اینستنس هم‌زمان هر job را فقط یک‌بار برمی‌دارند.
 *   ۳. retry با backoff نمایی (۳۰s, ۱m, ۲m, ۴m) برای خطاهای موقت؛
 *      بعد از maxAttempts → dead (DLQ).
 *   ۴. خطای دائمی (موجودی ناکافی، وضعیت نامعتبر) → failed بدون تلاش دوباره.
 *   ۵. visibility timeout — claimهای older از ۲ دقیقه (کرش کارگر) دوباره آزاد
 *      می‌شوند.
 *
 * کارگر: processHighValueQueue() — cron هر دقیقه + best-effort بعد از enqueue.
 * handler ها توسط high-value-registry.ts (یا تست) register می‌شوند.
 */

import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';

export type HighValueOperation = 'CONFIRM_TRANSFER' | 'CONFIRM_WITHDRAW' | 'MARK_SETTLEMENT_PAID';

export type HighValueJobStatus =
  | 'pending'
  | 'processing'
  | 'retry'
  | 'completed'
  | 'failed'
  | 'dead';

export interface HighValueJobPayload {
  customerId?: string;
  actorId?: string;
  [key: string]: unknown;
}

export type HighValueJobResult =
  | { ok: true; alreadyProcessed?: boolean }
  | { ok: false; retryable: boolean; code?: string; message: string };

export type HighValueJobHandler = (input: {
  targetId: string;
  payload?: HighValueJobPayload;
}) => Promise<HighValueJobResult>;

const handlers = new Map<string, HighValueJobHandler>();

/** ثبت handler یک operation — توسط registry (یا تست) صدا زده می‌شود. */
export function registerHighValueHandler(operation: string, handler: HighValueJobHandler): void {
  handlers.set(operation, handler);
}

export function getRegisteredHighValueOperations(): string[] {
  return Array.from(handlers.keys());
}

const DEFAULT_MAX_ATTEMPTS = 4;
/** backoff پایه: ۳۰ ثانیه → تلاش‌ها ۳۰s, ۱m, ۲m, ۴m (مجموع ~۷.۵ دقیقه) */
const BASE_RETRY_MS = 30_000;
/** حداکثر job در هر اجرای کارگر */
const CLAIM_BATCH = 20;
/** claimی که بیشتر از این مدت در processing مانده (کرش کارگر) → آزاد می‌شود */
const CLAIM_TIMEOUT_MS = 2 * 60_000;

export const HIGH_VALUE_QUEUE_CONSTANTS = {
  baseRetryMs: BASE_RETRY_MS,
  claimTimeoutMs: CLAIM_TIMEOUT_MS,
  defaultMaxAttempts: DEFAULT_MAX_ATTEMPTS,
};

function isP2002(err: unknown): boolean {
  return (err as { code?: string })?.code === 'P2002';
}

export interface EnqueueHighValueInput {
  operation: HighValueOperation;
  targetId: string;
  payload?: HighValueJobPayload;
  triggeredBy?: string;
  maxAttempts?: number;
}

export type EnqueueHighValueResult =
  | { success: true; id: string; deduped?: boolean }
  | { success: false; message: string };

/**
 * enqueueHighValueJob — ثبت job در صف (سریع؛ بدون پردازش هم‌زمان الزامی).
 * بعد از ثبت، processHighValueQueue به‌صورت best-effort و غیرهم‌زمان اجرا می‌شود.
 *
 * dedupe:
 *   - اگر job فعال (pending/processing/retry) برای همین (operation, targetId)
 *     باشد → deduped=true (درخواست دوم نادیده گرفته می‌شود — idempotent).
 *   - اگر job terminal (completed/failed/dead) باشد → به pending برگردانده می‌شود
 *     تا confirm دوباره (مثلاً بعد از رفع خطا) عملیات را اجرا کند. این امن است
 *     چون خود handler با atomic claim بازهم idempotent است.
 */
export async function enqueueHighValueJob(
  input: EnqueueHighValueInput,
): Promise<EnqueueHighValueResult> {
  try {
    const created = await prisma.highValueJob.create({
      data: {
        operation: input.operation,
        targetId: input.targetId,
        payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
        maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
        triggeredBy: input.triggeredBy ?? null,
      },
      select: { id: true },
    });
    // اجرای فوری best-effort — claim اتمیک است، چند اینستنس امن می‌ماند
    void processHighValueQueue();
    return { success: true, id: created.id };
  } catch (err) {
    if (isP2002(err)) {
      const existing = await prisma.highValueJob.findUnique({
        where: { operation_targetId: { operation: input.operation, targetId: input.targetId } },
        select: { id: true, status: true },
      });
      if (!existing) {
        return { success: false, message: 'خطا در ثبت صف پردازش تراکنش' };
      }
      if (existing.status === 'pending' || existing.status === 'processing' || existing.status === 'retry') {
        // single-flight: همان عملیات هنوز در صف است — نادیده بگیر (idempotent)
        return { success: true, id: existing.id, deduped: true };
      }
      // job قبلی terminal شده — اجازهٔ تلاش دوباره بده (reset به pending)
      await prisma.highValueJob.update({
        where: { id: existing.id },
        data: {
          status: 'pending',
          attempts: 0,
          lastError: null,
          nextAttemptAt: new Date(),
          lockedAt: null,
          completedAt: null,
        },
      });
      void processHighValueQueue();
      return { success: true, id: existing.id };
    }
    return { success: false, message: 'خطا در ثبت صف پردازش تراکنش' };
  }
}

/** وضعیت فعلی job برای یک (operation, targetId) — برای پاسخ به کلاینت. */
export async function getHighValueJobStatus(
  operation: HighValueOperation,
  targetId: string,
): Promise<{ status: HighValueJobStatus | null; lastError: string | null }> {
  try {
    const job = await prisma.highValueJob.findUnique({
      where: { operation_targetId: { operation, targetId } },
      select: { status: true, lastError: true },
    });
    if (!job) return { status: null, lastError: null };
    return { status: job.status as HighValueJobStatus, lastError: job.lastError };
  } catch {
    return { status: null, lastError: null };
  }
}

/**
 * mapQueuedJobError — تبدیل lastError ثبت‌شده در job (قالب `CODE::message`)
 * به خطای قابل‌نمایش برای کلاینت. کدهای شناخته‌شده پیام فارسی خودشان را دارند.
 */
export function mapQueuedJobError(
  lastError: string | null,
  fallback: string,
): { code: string; message: string } {
  const [code, ...rest] = (lastError ?? '').split('::');
  const message = rest.join('::') || fallback;
  if (code === 'INSUFFICIENT_BALANCE') {
    return { code, message: 'موجودی کافی نیست' };
  }
  if (code === 'RECIPIENT_NO_ACCOUNT') {
    return { code, message: 'گیرنده دیگر حساب فعالی برای این ارز ندارد. مبلغ برگشت نخورده است.' };
  }
  if (code && code !== 'INTERNAL_ERROR' && code !== 'ERROR' && code !== 'NO_HANDLER') {
    return { code, message };
  }
  return { code: 'PROCESSING_FAILED', message };
}

/** فرمت استاندارد خطا برای ذخیره در lastError: `CODE::message` */
export function formatJobError(code: string | undefined, message: string): string {
  return `${code ?? 'ERROR'}::${message}`;
}

async function markJobRetry(jobId: string, attempts: number, maxAttempts: number, error: string): Promise<void> {
  if (attempts >= maxAttempts) {
    await prisma.highValueJob.update({
      where: { id: jobId },
      data: { status: 'dead', attempts, lastError: error, lockedAt: null, completedAt: new Date() },
    });
    return;
  }
  const delayMs = BASE_RETRY_MS * 2 ** (attempts - 1);
  await prisma.highValueJob.update({
    where: { id: jobId },
    data: {
      status: 'retry',
      attempts,
      nextAttemptAt: new Date(Date.now() + delayMs),
      lastError: error,
      lockedAt: null,
    },
  });
}

/**
 * processHighValueQueue — یک batch از jobهای موعدرسیده را برمی‌دارد و اجرا می‌کند.
 * امن برای چند اینستنس هم‌زمان (claim اتمیک). هرگز throw نمی‌کند.
 */
export async function processHighValueQueue(): Promise<{ processed: number; failed: number }> {
  const result = { processed: 0, failed: 0 };
  try {
    // ۱) آزادسازی claimهای گیر کرده (کارگر وسط اجرا کرش کرده)
    await prisma.highValueJob.updateMany({
      where: {
        status: 'processing',
        lockedAt: { lt: new Date(Date.now() - CLAIM_TIMEOUT_MS) },
      },
      data: { status: 'pending', lockedAt: null },
    });

    // ۲) claim اتمیک یک batch — FIFO به ترتیب createdAt + SKIP LOCKED
    const claimedIds = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM "HighValueJob"
          WHERE status IN ('pending', 'retry') AND "nextAttemptAt" <= now()
          ORDER BY "createdAt" ASC
          LIMIT ${CLAIM_BATCH}
          FOR UPDATE SKIP LOCKED`,
      );
      if (rows.length === 0) return [] as string[];
      await tx.highValueJob.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { status: 'processing', lockedAt: new Date() },
      });
      return rows.map((r) => r.id);
    });

    if (claimedIds.length === 0) return result;

    const jobs = await prisma.highValueJob.findMany({
      where: { id: { in: claimedIds } },
      select: {
        id: true,
        operation: true,
        targetId: true,
        payload: true,
        attempts: true,
        maxAttempts: true,
      },
    });

    for (const job of jobs) {
      const handler = handlers.get(job.operation);
      if (!handler) {
        // بدون handler → خطای دائمی؛ تلاش دوباره فایده ندارد
        result.failed += 1;
        await prisma.highValueJob.update({
          where: { id: job.id },
          data: {
            status: 'dead',
            lastError: `NO_HANDLER:${job.operation}`,
            lockedAt: null,
            completedAt: new Date(),
          },
        });
        continue;
      }

      try {
        const res = await handler({
          targetId: job.targetId,
          payload: (job.payload ?? undefined) as HighValueJobPayload | undefined,
        });

        if (res.ok) {
          result.processed += 1;
          await prisma.highValueJob.update({
            where: { id: job.id },
            data: { status: 'completed', completedAt: new Date(), lastError: null, lockedAt: null },
          });
        } else if (!res.retryable) {
          result.failed += 1;
          await prisma.highValueJob.update({
            where: { id: job.id },
            data: {
              status: 'failed',
              lastError: formatJobError(res.code, res.message),
              lockedAt: null,
              completedAt: new Date(),
            },
          });
        } else {
          result.failed += 1;
          await markJobRetry(job.id, job.attempts + 1, job.maxAttempts, formatJobError(res.code, res.message));
        }
      } catch (err) {
        // استثنای غیرمنتظره → همان مسیر retry (خطای موقت فرض می‌شود)
        result.failed += 1;
        const msg = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
        await markJobRetry(job.id, job.attempts + 1, job.maxAttempts, msg);
      }
    }
  } catch {
    // best-effort — خطای صف هرگز نباید بیرون برود
  }
  return result;
}
