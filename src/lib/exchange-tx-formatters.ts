/**
 * lib/exchange-tx-formatters.ts
 *
 * Shared formatters and label maps for the exchange transactions workspace.
 * Reuses the canonical labels from @/lib/exchange-labels but adds the
 * credit/debit/visual-tone interpretation that the new UI needs.
 *
 * هدف: یک‌بار تعریف، چندین‌بار استفاده (Workspace + Detail sub-route + KPI ribbon).
 */

import {
  EXCHANGE_CURRENCIES,
  TX_KIND_FA,
  TX_STATUS_FA,
} from '@/lib/exchange-labels';
import { formatJalaliCompact, formatJalaliDateTime } from '@/lib/format-jalali';
import type { TransactionRow } from '@/actions/exchange-transactions';

// توضیح: این ماژول فقط types و formatters دارد؛ نباید side-effect دیگری داشته باشد.
// (قبلاً export غیرعمدی حذف شده بود که در ویرایش جدید برگشت داده شد.)

// ─── Visual tone (semantic, token-friendly) ────────────────────────────────

export type TxTone = 'credit' | 'debit' | 'neutral';

export function getTxTone(kind: string): TxTone {
  if (kind === 'DEPOSIT') return 'credit';
  if (kind === 'WITHDRAWAL' || kind === 'FEE') return 'debit';
  return 'neutral';
}

// ─── Status visual key (matches StatusBadge / StatusPill) ──────────────────

export type TxStatusKey = 'pending' | 'progress' | 'success' | 'danger' | 'cancelled';

export function getTxStatusKey(status: string): TxStatusKey {
  switch (status) {
    case 'PENDING':
      return 'pending';
    case 'PROCESSING':
      return 'progress';
    case 'COMPLETED':
      return 'success';
    case 'FAILED':
    case 'REVERSED':
      return 'danger';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pending';
  }
}

// ─── Numeric helpers ───────────────────────────────────────────────────────

/**
 * BigInt-as-string from Prisma → human amount (the column is cents * 100).
 * استفاده از Decimal-safe parse تا خطای float ندهد.
 */
export function amountFromBigInt(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const raw = typeof value === 'string' ? value : String(value);
  if (raw === '' || raw === 'null' || raw === 'undefined') return 0;
  try {
    return Number(BigInt(raw)) / 100;
  } catch {
    return Number(raw) / 100;
  }
}

const FA_NUM_CACHE = new Map<string, string>();
export function faNum(value: number): string {
  const key = value.toString();
  const hit = FA_NUM_CACHE.get(key);
  if (hit) return hit;
  const out = new Intl.NumberFormat('fa-IR').format(value);
  if (FA_NUM_CACHE.size > 500) FA_NUM_CACHE.clear();
  FA_NUM_CACHE.set(key, out);
  return out;
}

export function formatAmount(value: string | number | null | undefined, currency: string): string {
  return `${faNum(amountFromBigInt(value))} ${currency}`;
}

export function formatAmountShort(value: string | number | null | undefined, currency: string): string {
  return `${faNum(Math.round(amountFromBigInt(value)))} ${currency}`;
}

// ─── Composite derived types ───────────────────────────────────────────────

export interface TxRowEnriched {
  id: string;
  exchangeId: string;
  kind: string;
  status: string;
  kindLabel: string;
  statusLabel: string;
  statusKey: TxStatusKey;
  tone: TxTone;
  amount: number;
  amountStr: string;
  feeAmount: number;
  feeStr: string;
  currency: string;
  destAmount: number | null;
  destAmountStr: string | null;
  destCurrency: string | null;
  rate: number | null;
  note: string | null;
  counterparty: string | null;
  createdAt: string;
  createdAtCompact: string;
  createdAtFull: string;
  customerName: string | null;
  customerPhone: string | null;
  customerInitial: string;
}

export function enrichRow(row: TransactionRow): TxRowEnriched {
  const amount = amountFromBigInt(row.amount);
  const feeAmount = amountFromBigInt(row.fee);
  const destAmount = row.destAmount !== null ? amountFromBigInt(row.destAmount) : null;
  const customerName = row.customer?.fullName ?? null;
  const customerPhone = row.customer?.phone ?? null;
  const customerInitial = customerName
    ? customerName.trim().charAt(0)
    : '—';

  return {
    id: row.id,
    exchangeId: row.exchangeId,
    kind: row.kind,
    status: row.status,
    kindLabel: TX_KIND_FA[row.kind] ?? row.kind,
    statusLabel: TX_STATUS_FA[row.status]?.label ?? row.status,
    statusKey: getTxStatusKey(row.status),
    tone: getTxTone(row.kind),
    amount,
    amountStr: formatAmount(row.amount, row.currency),
    feeAmount,
    feeStr: formatAmount(row.fee, row.currency),
    currency: row.currency,
    destAmount,
    destAmountStr: destAmount !== null ? formatAmount(row.destAmount, row.destCurrency ?? row.currency) : null,
    destCurrency: row.destCurrency,
    rate: row.rate,
    note: row.note,
    counterparty: row.counterparty,
    createdAt: row.createdAt,
    createdAtCompact: formatJalaliCompact(row.createdAt),
    createdAtFull: formatJalaliDateTime(row.createdAt),
    customerName,
    customerPhone,
    customerInitial,
  };
}

export function enrichRows(rows: TransactionRow[]): TxRowEnriched[] {
  return rows.map(enrichRow);
}

// ─── Aggregate helpers (for KPI ribbon) ────────────────────────────────────

export interface TxAggregate {
  total: number;
  totalAmount: number;
  totalFee: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  exchangeCount: number;
  depositAmount: number;
  withdrawalAmount: number;
  todayCount: number;
  yesterdayCount: number;
  primaryCurrency: string;
}

export function aggregateRows(rows: TxRowEnriched[], primaryCurrency: string): TxAggregate {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let totalAmount = 0;
  let totalFee = 0;
  let depositAmount = 0;
  let withdrawalAmount = 0;
  let completedCount = 0;
  let pendingCount = 0;
  let failedCount = 0;
  let exchangeCount = 0;
  let todayCount = 0;
  let yesterdayCount = 0;

  for (const r of rows) {
    if (r.currency === primaryCurrency) {
      totalAmount += r.amount;
      totalFee += r.feeAmount;
    }
    if (r.kind === 'DEPOSIT' && r.currency === primaryCurrency) depositAmount += r.amount;
    if (r.kind === 'WITHDRAWAL' && r.currency === primaryCurrency) withdrawalAmount += r.amount;
    if (r.status === 'COMPLETED') completedCount += 1;
    else if (r.status === 'PENDING' || r.status === 'PROCESSING') pendingCount += 1;
    else if (r.status === 'FAILED' || r.status === 'REVERSED' || r.status === 'CANCELLED') {
      failedCount += 1;
    }
    if (r.kind === 'EXCHANGE') exchangeCount += 1;
    const ts = new Date(r.createdAt).getTime();
    if (ts >= today.getTime()) todayCount += 1;
    else if (ts >= yesterday.getTime() && ts < today.getTime()) yesterdayCount += 1;
  }

  return {
    total: rows.length,
    totalAmount,
    totalFee,
    completedCount,
    pendingCount,
    failedCount,
    exchangeCount,
    depositAmount,
    withdrawalAmount,
    todayCount,
    yesterdayCount,
    primaryCurrency,
  };
}

// ─── Currency constants (re-exported for convenience) ──────────────────────

export { EXCHANGE_CURRENCIES };
