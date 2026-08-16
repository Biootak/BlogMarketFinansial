'use server';

/**
 * reporting.ts — گزارش‌دهی مالی برای صرافی
 *
 * P&L per currency، حجم معاملات، fee breakdown، CSV export.
 * فقط اعضای صرافی (OWNER/MANAGER) می‌توانند گزارش‌ها را ببینند.
 */

import prisma from '@/lib/db';
import { requireExchangeAccess } from '@/lib/exchange-auth';
import type { FintechActionResult } from '@/types/types';
import { Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PnLByCurrency = {
  currency: string;
  totalVolume: number;
  totalFee: number;
  dealCount: number;
  avgDealSize: number;
};

export type DailySummary = {
  date: string; // YYYY-MM-DD
  dealCount: number;
  volume: number;
  fee: number;
};

export type ReportData = {
  pnlByCurrency: PnLByCurrency[];
  dailySummary: DailySummary[];
  /** حجم اصلی‌ترین ارز (primaryCurrency) — نه جمع چند-ارزی */
  totalVolume: number;
  /** کارمزد کل به ارز primaryCurrency */
  totalFee: number;
  totalDeals: number;
  /** ارز غالب (بیشترین حجم) برای نمایش label */
  dominantCurrency: string;
  topCustomers: {
    customerId: string;
    fullName: string;
    dealCount: number;
    totalVolume: number;
    currency: string;
  }[];
};

// ─── GET REPORT ───────────────────────────────────────────────────────────────

const ReportSchema = z.object({
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  currency: z.string().optional(),
});

/**
 * cursor-based pagination — بر اساس داک رسمی Prisma 2026:
 * orderBy composite (completedAt + id) جلوی skip/duplicate را می‌گیرد.
 * منبع: https://www.prisma.io/docs/orm/prisma-client/queries/pagination#cursor-based-pagination
 *
 * completedAt: not null در where اجباری است تا cursor روی null گیر نکند.
 */
type DealRow = { id: string; completedAt: Date | null } & Record<string, unknown>;

async function fetchAllDeals(
  // biome-ignore lint/suspicious/noExplicitAny: where/select typed at call sites
  where: any,
  // biome-ignore lint/suspicious/noExplicitAny: where/select typed at call sites
  select: any,
  orderDir: 'asc' | 'desc' = 'asc',
): Promise<DealRow[]> {
  const PAGE_SIZE = 1000;
  const all: DealRow[] = [];

  let lastId: string | undefined;

  while (true) {
    // double-cast لازم است چون spread type Prisma با DealRow overlap نمی‌کند
    const batch = (await prisma.currencyDeal.findMany({
      where,
      select: { id: true, completedAt: true, ...select },
      orderBy: [{ completedAt: orderDir }, { id: orderDir }],
      take: PAGE_SIZE,
      ...(lastId != null ? { cursor: { id: lastId }, skip: 1 } : {}),
    })) as unknown as DealRow[];

    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;

    const last = batch[batch.length - 1];
    // اگر completedAt null بود (نباید بشود چون where دارد) → خروج امن
    if (!last || last.completedAt == null) break;
    lastId = last.id;
  }

  return all;
}

export async function getExchangeReport(
  exchangeId: string,
  raw?: unknown,
): Promise<FintechActionResult<ReportData>> {
  const auth = await requireExchangeAccess(exchangeId);
  if (!auth.ok) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'دسترسی غیرمجاز' } };
  }

  const parsed = ReportSchema.safeParse(raw ?? {});
  const filters = parsed.success ? parsed.data : {};

  // پیش‌فرض: ۳۰ روز گذشته
  const toDate = filters.toDate ?? new Date();
  const fromDate = filters.fromDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const where = {
    exchangeId,
    status: 'COMPLETED' as const,
    // completedAt: not null — چون cursor بر اساس completedAt است
    completedAt: { not: null, gte: fromDate, lte: toDate },
    ...(filters.currency ? { fromCurrency: filters.currency } : {}),
  };

  const select = {
    fromAmount: true,
    fromCurrency: true,
    feeAmount: true,
    userId: true,
    customerName: true,
    customerPhone: true,
  };

  const allDeals = (await fetchAllDeals(where, select)) as Array<{
    id: string;
    completedAt: Date | null;
    fromAmount: import('@prisma/client/runtime/library').Decimal;
    fromCurrency: string;
    feeAmount: import('@prisma/client/runtime/library').Decimal;
    userId: string | null;
    customerName: string;
    customerPhone: string;
  }>;

  // P&L by currency
  const pnlMap = new Map<string, PnLByCurrency>();
  for (const d of allDeals) {
    const cur = d.fromCurrency;
    const vol = new Decimal(d.fromAmount.toString()).toNumber();
    const fee = new Decimal(d.feeAmount.toString()).toNumber();
    if (!pnlMap.has(cur)) {
      pnlMap.set(cur, { currency: cur, totalVolume: 0, totalFee: 0, dealCount: 0, avgDealSize: 0 });
    }
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by Map.set above
    const entry = pnlMap.get(cur)!;
    entry.totalVolume += vol;
    entry.totalFee += fee;
    entry.dealCount += 1;
  }
  for (const entry of pnlMap.values()) {
    entry.avgDealSize = entry.dealCount > 0 ? entry.totalVolume / entry.dealCount : 0;
  }
  const pnlByCurrency = [...pnlMap.values()].sort((a, b) => b.totalVolume - a.totalVolume);

  // P2-1 fix: totalVolume/Fee فقط از ارز غالب (dominant) — نه جمع ریاضی چند-ارزی
  const dominant = pnlByCurrency[0];
  const dominantCurrency = dominant?.currency ?? 'AFN';
  const totalVolume = dominant?.totalVolume ?? 0;
  const totalFee = dominant?.totalFee ?? 0;

  // Daily summary
  const dailyMap = new Map<string, DailySummary>();
  for (const d of allDeals) {
    if (!d.completedAt) continue;
    const dateStr = d.completedAt.toISOString().slice(0, 10);
    if (!dailyMap.has(dateStr)) {
      dailyMap.set(dateStr, { date: dateStr, dealCount: 0, volume: 0, fee: 0 });
    }
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by Map.set above
    const day = dailyMap.get(dateStr)!;
    day.dealCount += 1;
    day.volume += new Decimal(d.fromAmount.toString()).toNumber();
    day.fee += new Decimal(d.feeAmount.toString()).toNumber();
  }
  const dailySummary = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  // Top customers
  // P0-3 fix: key = userId اگر موجود، وگرنه phone — فقط اگر phone خالی نباشد
  const customerMap = new Map<
    string,
    {
      customerId: string;
      fullName: string;
      dealCount: number;
      totalVolume: number;
      currency: string;
    }
  >();
  for (const d of allDeals) {
    // phone خالی (empty string) را به عنوان key نپذیر — از merge ناخواسته جلوگیری می‌کند
    const rawPhone = d.customerPhone?.trim();
    const key = d.userId ?? (rawPhone || null) ?? `name:${d.customerName}`;
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        customerId: key,
        fullName: d.customerName,
        dealCount: 0,
        totalVolume: 0,
        // P2-2 fix: هر مشتری ارز واقعی معاملاتش را دارد
        currency: d.fromCurrency,
      });
    }
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by Map.set above
    const c = customerMap.get(key)!;
    c.dealCount += 1;
    c.totalVolume += new Decimal(d.fromAmount.toString()).toNumber();
  }
  const topCustomers = [...customerMap.values()]
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, 10);

  return {
    success: true,
    data: {
      pnlByCurrency,
      dailySummary,
      totalVolume,
      totalFee,
      totalDeals: allDeals.length,
      dominantCurrency,
      topCustomers,
    },
  };
}

// ─── CSV EXPORT ───────────────────────────────────────────────────────────────

/**
 * generateReportCsv — ساخت CSV از معاملات یک دوره
 *
 * شامل: تاریخ، ارز، مبلغ، کارمزد، مشتری
 * BOM برای سازگاری با Excel فارسی اضافه شده.
 */
export async function generateReportCsv(
  exchangeId: string,
  raw?: unknown,
): Promise<FintechActionResult<{ csv: string; filename: string }>> {
  const auth = await requireExchangeAccess(exchangeId);
  if (!auth.ok) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'دسترسی غیرمجاز' } };
  }

  const parsed = ReportSchema.safeParse(raw ?? {});
  const filters = parsed.success ? parsed.data : {};

  const toDate = filters.toDate ?? new Date();
  const fromDate = filters.fromDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const where = {
    exchangeId,
    status: 'COMPLETED' as const,
    completedAt: { not: null, gte: fromDate, lte: toDate },
  };

  const select = {
    fromAmount: true,
    fromCurrency: true,
    toAmount: true,
    toCurrency: true,
    feeAmount: true,
    customerName: true,
    customerPhone: true,
  };

  const allCsvDeals = (await fetchAllDeals(where, select, 'desc')) as Array<{
    id: string;
    completedAt: Date | null;
    fromAmount: import('@prisma/client/runtime/library').Decimal;
    fromCurrency: string;
    toAmount: import('@prisma/client/runtime/library').Decimal;
    toCurrency: string;
    feeAmount: import('@prisma/client/runtime/library').Decimal;
    customerName: string;
    customerPhone: string;
  }>;

  const dateFormatter = new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const headers = [
    'تاریخ',
    'مشتری',
    'تلفن',
    'ارز مبدأ',
    'مبلغ مبدأ',
    'ارز مقصد',
    'مبلغ مقصد',
    'کارمزد',
  ];
  const rows = allCsvDeals.map((d) => [
    d.completedAt ? dateFormatter.format(d.completedAt) : '',
    d.customerName,
    d.customerPhone,
    d.fromCurrency,
    new Decimal(d.fromAmount.toString()).toFixed(2),
    d.toCurrency,
    d.toAmount ? new Decimal(d.toAmount.toString()).toFixed(2) : '',
    new Decimal(d.feeAmount.toString()).toFixed(2),
  ]);

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
  const filename = `گزارش-معاملات-${new Date().toLocaleDateString('fa-IR')}.csv`;

  return { success: true, data: { csv: `\uFEFF${csv}`, filename } };
}
