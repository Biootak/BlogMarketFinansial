'use server';

/**
 * platform-finance-report.ts — گزارش مالی کلی پلتفرم برای ADMIN/OWNER
 *
 * آمار Transaction + Settlement + CurrencyDeal روی همه صراف‌ها.
 * فقط ADMIN/OWNER/SUPERADMIN دسترسی دارند.
 */

import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';
import type { FintechActionResult } from '@/types/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlatformFinanceKpi = {
  totalTransactions: number;
  completedTransactions: number;
  pendingTransactions: number;
  totalVolumeSampled: string; /** مجموع (sample — فقط ۱۰۰۰ رکورد اخیر) */
  totalSettlements: number;
  pendingSettlements: number;
  paidSettlements: number;
  totalExchanges: number;
  activeExchanges: number;
  totalCustomers: number;
  activeCustomers: number;
};

export type TransactionTrend = {
  date: string;        // YYYY-MM-DD
  count: number;
  completed: number;
  failed: number;
};

export type ExchangeVolumeRow = {
  exchangeId: string;
  exchangeName: string;
  txCount: number;
  customerCount: number;
};

export type SettlementStatusDist = {
  status: string;
  count: number;
};

export type PlatformFinanceReport = {
  kpi: PlatformFinanceKpi;
  txTrend: TransactionTrend[];           // روزانه ۳۰ روز گذشته
  topExchanges: ExchangeVolumeRow[];     // ۸ صرافی برتر
  settlementDist: SettlementStatusDist[];
};

// ─── Action ───────────────────────────────────────────────────────────────────

export async function getPlatformFinanceReport(): Promise<
  FintechActionResult<PlatformFinanceReport>
> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: auth.code, message: auth.message } };
  }

  const now = new Date();
  const from30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // ── KPI ────────────────────────────────────────────────────────────────────
  const [
    totalTransactions,
    completedTransactions,
    pendingTransactions,
    totalSettlements,
    pendingSettlements,
    paidSettlements,
    totalExchanges,
    activeExchanges,
    totalCustomers,
    activeCustomers,
  ] = await Promise.all([
    prisma.transaction.count(),
    prisma.transaction.count({ where: { status: 'COMPLETED' } }),
    prisma.transaction.count({ where: { status: 'PENDING' } }),
    prisma.settlement.count(),
    prisma.settlement.count({ where: { status: 'PENDING' } }),
    prisma.settlement.count({ where: { status: 'PAID' } }),
    prisma.exchange.count(),
    prisma.exchange.count({ where: { status: 'ACTIVE' } }),
    prisma.customer.count(),
    prisma.customer.count({ where: { status: 'ACTIVE' } }),
  ]);

  // حجم ۱۰۰۰ تراکنش اخیر (sample — از BigInt به string)
  const recentTx = await prisma.transaction.findMany({
    where: { status: 'COMPLETED' },
    select: { amount: true },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });
  const totalVolumeSampled = recentTx
    .reduce((sum, t) => sum + t.amount, BigInt(0))
    .toString();

  // ── Trend: روزانه ۳۰ روز ────────────────────────────────────────────────
  const recentTxForTrend = await prisma.transaction.findMany({
    where: { createdAt: { gte: from30 } },
    select: { createdAt: true, status: true },
    orderBy: { createdAt: 'asc' },
    take: 5000,
  });

  const trendMap = new Map<string, TransactionTrend>();
  for (const tx of recentTxForTrend) {
    const d = tx.createdAt.toISOString().slice(0, 10);
    if (!trendMap.has(d)) {
      trendMap.set(d, { date: d, count: 0, completed: 0, failed: 0 });
    }
    const day = trendMap.get(d)!;
    day.count++;
    if (tx.status === 'COMPLETED') day.completed++;
    if (tx.status === 'FAILED') day.failed++;
  }
  const txTrend = [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  // ── Top exchanges ─────────────────────────────────────────────────────────
  const txByExchange = await prisma.transaction.groupBy({
    by: ['exchangeId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 8,
  });

  const exchangeIds = txByExchange.map((r) => r.exchangeId);
  const [exchanges, customerCounts] = await Promise.all([
    prisma.exchange.findMany({
      where: { id: { in: exchangeIds } },
      select: { id: true, name: true },
    }),
    prisma.customer.groupBy({
      by: ['exchangeId'],
      where: { exchangeId: { in: exchangeIds } },
      _count: { id: true },
    }),
  ]);

  const exMap = new Map(exchanges.map((e) => [e.id, e.name]));
  const custMap = new Map(customerCounts.map((c) => [c.exchangeId, c._count.id]));

  const topExchanges: ExchangeVolumeRow[] = txByExchange.map((r) => ({
    exchangeId: r.exchangeId,
    exchangeName: exMap.get(r.exchangeId) ?? r.exchangeId.slice(0, 8),
    txCount: r._count.id,
    customerCount: custMap.get(r.exchangeId) ?? 0,
  }));

  // ── Settlement distribution ───────────────────────────────────────────────
  const settlDist = await prisma.settlement.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const settlementDist: SettlementStatusDist[] = settlDist.map((r) => ({
    status: r.status,
    count: r._count.id,
  }));

  return {
    success: true,
    data: {
      kpi: {
        totalTransactions,
        completedTransactions,
        pendingTransactions,
        totalVolumeSampled,
        totalSettlements,
        pendingSettlements,
        paidSettlements,
        totalExchanges,
        activeExchanges,
        totalCustomers,
        activeCustomers,
      },
      txTrend,
      topExchanges,
      settlementDist,
    },
  };
}
