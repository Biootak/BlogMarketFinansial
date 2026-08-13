/**
 * txn-trail.ts — ثبت ردیابی غیرقابل‌ویرایش تراکنش‌های فینتک
 * ---------------------------------------------------------------------------
 * دو نوع رکورد append-only:
 *   ۱. TransactionStatusLog — هر بار status یک Transaction تغییر می‌کند
 *   ۲. FintechEventLog      — رویدادهای غیر تراکنشی (فریز کارت، بستن حساب، …)
 *
 * قوانین:
 *   - هیچ‌کدام از این جداول هرگز update یا delete نمی‌شوند.
 *   - همه توابع best-effort هستند — شکست در ثبت ردیابی نباید عملیات اصلی را fail کند.
 *   - در صورت امکان داخل همان prisma.$transaction صدا زده شوند تا atomicity حفظ شود.
 */

import prisma from '@/lib/db';

// ─── TransactionStatusLog ────────────────────────────────────────────────────

export interface TxnStatusLogParams {
  txnId: string;
  fromStatus: string | null;
  toStatus: string;
  actorId?: string | null;
  actorRole?: string | null;
  ip?: string | null;
  note?: string | null;
}

/**
 * ثبت یک رکورد تغییر وضعیت تراکنش — immutable.
 * اگر داخل یک prisma.$transaction صدا زده می‌شود، tx را پاس بده.
 */
export async function logTxnStatusChange(
  params: TxnStatusLogParams,
  tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
): Promise<void> {
  const db = tx ?? prisma;
  try {
    await db.transactionStatusLog.create({
      data: {
        txnId: params.txnId,
        fromStatus: params.fromStatus ?? null,
        toStatus: params.toStatus,
        actorId: params.actorId ?? null,
        actorRole: params.actorRole ?? null,
        ip: params.ip ?? null,
        note: params.note ?? null,
      },
    });
  } catch {
    // best-effort — شکست در ثبت ردیابی نباید عملیات اصلی را fail کند
  }
}

// ─── FintechEventLog ─────────────────────────────────────────────────────────

export type FintechEventType =
  | 'ACCOUNT_FROZEN'
  | 'ACCOUNT_UNFROZEN'
  | 'ACCOUNT_CLOSED'
  | 'ACCOUNT_ACTIVATED'
  | 'CARD_FROZEN'
  | 'CARD_UNFROZEN'
  | 'CARD_BLOCKED'
  | 'CARD_ISSUED'
  | 'KYC_LIMIT_CHANGED'
  | 'FRAUD_BLOCKED'
  | 'FRAUD_HELD'
  | 'OTP_REQUESTED'
  | 'OTP_VERIFIED'
  | 'OTP_FAILED'
  | 'TRANSFER_FRAUD_CHECKED'
  | 'WITHDRAWAL_FRAUD_CHECKED'
  | 'FX_FRAUD_CHECKED';

export interface FintechEventLogParams {
  eventType: FintechEventType;
  entityType: string;
  entityId: string;
  exchangeId?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  ip?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  note?: string | null;
}

/**
 * ثبت یک رویداد غیرتراکنشی فینتک — immutable.
 * هرگز throw نمی‌کند — best-effort.
 */
export async function logFintechEvent(params: FintechEventLogParams): Promise<void> {
  try {
    await prisma.fintechEventLog.create({
      data: {
        eventType: params.eventType,
        entityType: params.entityType,
        entityId: params.entityId,
        exchangeId: params.exchangeId ?? null,
        actorId: params.actorId ?? null,
        actorRole: params.actorRole ?? null,
        ip: params.ip ?? null,
        before: (params.before ?? undefined) as import('@prisma/client').Prisma.InputJsonValue | undefined,
        after: (params.after ?? undefined) as import('@prisma/client').Prisma.InputJsonValue | undefined,
        note: params.note ?? null,
      },
    });
  } catch {
    // best-effort — شکست در ثبت event نباید عملیات اصلی را fail کند
  }
}
