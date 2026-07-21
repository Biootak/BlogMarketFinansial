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
  totalVolume: number;
  totalFee: number;
  totalDeals: number;
  topCustomers: {
    customerId: string;
    fullName: string;
    dealCount: number;
    totalVolume: number;
  }[];
};

// ─── GET REPORT ───────────────────────────────────────────────────────────────

const ReportSchema = z.object({
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  currency: z.string().optional(),
});

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

  const deals = await prisma.currencyDeal.findMany({
    where: {
      exchangeId,
      status: 'COMPLETED',
      completedAt: { gte: fromDate, lte: toDate },
      ...(filters.currency ? { fromCurrency: filters.currency } : {}),
    },
    select: {
      fromAmount: true,
      fromCurrency: true,
      feeAmount: true,
      completedAt: true,
      userId: true,
      customerName: true,
      customerPhone: true,
    },
    orderBy: { completedAt: 'asc' },
    take: 5000,
  });

  // P&L by currency
  const pnlMap = new Map<string, PnLByCurrency>();
  for (const d of deals) {
    const cur = d.fromCurrency;
    const vol = Number(d.fromAmount);
    const fee = Number(d.feeAmount ?? 0);
    if (!pnlMap.has(cur)) {
      pnlMap.set(cur, { currency: cur, totalVolume: 0, totalFee: 0, dealCount: 0, avgDealSize: 0 });
    }
    const entry = pnlMap.get(cur)!;
    entry.totalVolume += vol;
    entry.totalFee += fee;
    entry.dealCount += 1;
  }
  for (const entry of pnlMap.values()) {
    entry.avgDealSize = entry.dealCount > 0 ? entry.totalVolume / entry.dealCount : 0;
  }
  const pnlByCurrency = [...pnlMap.values()].sort((a, b) => b.totalVolume - a.totalVolume);

  // Daily summary
  const dailyMap = new Map<string, DailySummary>();
  for (const d of deals) {
    if (!d.completedAt) continue;
    const dateStr = d.completedAt.toISOString().slice(0, 10);
    if (!dailyMap.has(dateStr)) {
      dailyMap.set(dateStr, { date: dateStr, dealCount: 0, volume: 0, fee: 0 });
    }
    const day = dailyMap.get(dateStr)!;
    day.dealCount += 1;
    day.volume += Number(d.fromAmount);
    day.fee += Number(d.feeAmount ?? 0);
  }
  const dailySummary = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  // Top customers
  const customerMap = new Map<string, { customerId: string; fullName: string; dealCount: number; totalVolume: number }>();
  for (const d of deals) {
    const key = d.userId ?? d.customerPhone;
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        customerId: key,
        fullName: d.customerName,
        dealCount: 0,
        totalVolume: 0,
      });
    }
    const c = customerMap.get(key)!;
    c.dealCount += 1;
    c.totalVolume += Number(d.fromAmount);
  }
  const topCustomers = [...customerMap.values()]
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, 10);

  const totalVolume = pnlByCurrency.reduce((s, r) => s + r.totalVolume, 0);
  const totalFee = pnlByCurrency.reduce((s, r) => s + r.totalFee, 0);

  return {
    success: true,
    data: {
      pnlByCurrency,
      dailySummary,
      totalVolume,
      totalFee,
      totalDeals: deals.length,
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

  const deals = await prisma.currencyDeal.findMany({
    where: {
      exchangeId,
      status: 'COMPLETED',
      completedAt: { gte: fromDate, lte: toDate },
    },
    select: {
      id: true,
      fromAmount: true,
      fromCurrency: true,
      toAmount: true,
      toCurrency: true,
      feeAmount: true,
      completedAt: true,
      customerName: true,
      customerPhone: true,
    },
    orderBy: { completedAt: 'desc' },
    take: 10_000,
  });

  const dateFormatter = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' });

  const headers = ['تاریخ', 'مشتری', 'تلفن', 'ارز مبدأ', 'مبلغ مبدأ', 'ارز مقصد', 'مبلغ مقصد', 'کارمزد'];
  const rows = deals.map((d) => [
    d.completedAt ? dateFormatter.format(d.completedAt) : '',
    d.customerName,
    d.customerPhone,
    d.fromCurrency,
    Number(d.fromAmount).toFixed(2),
    d.toCurrency,
    d.toAmount ? Number(d.toAmount).toFixed(2) : '',
    d.feeAmount ? Number(d.feeAmount).toFixed(2) : '0',
  ]);

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
  const filename = `گزارش-معاملات-${new Date().toLocaleDateString('fa-IR')}.csv`;

  return { success: true, data: { csv: `\uFEFF${csv}`, filename } };
}
