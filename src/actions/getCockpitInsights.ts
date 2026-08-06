'use server';

/**
 * getCockpitInsights — aggregate های واقعی «میز فرماندهی» داشبورد.
 * ─────────────────────────────────────────────────────────────────
 * هیچ داده‌ی ساختگی/تصادفی در این فایل نیست. همه‌چیز مستقیم از Prisma:
 *
 *   1. txnTrend        → Transaction، ۱۴ روز اخیر، سطل‌بندی روزانه
 *   2. txn24h/Prev24h  → دو پنجره‌ی ۲۴ ساعته برای محاسبه‌ی delta واقعی
 *   3. volume7d/Prev7d → CurrencyDeal.fromAmount (COMPLETED) در دو پنجره‌ی ۷ روزه
 *   4. requestFunnel   → ServiceRequest groupBy(status)
 *   5. kycFunnel       → Customer groupBy(kycStatus)
 *   6. dealFunnel      → CurrencyDeal groupBy(status)
 *   7. pendingByService→ ServiceRequest groupBy(serviceType) روی صفِ PENDING
 *
 * همگی read-only، پشت safeCache (۱۲۰ ثانیه) تا صفحه‌ی خانه سنگین نشود و
 * خطای یک جدول کل داشبورد را نخواباند.
 */

import type {
  CockpitInsights,
  CockpitSegment,
} from '@/components/Dashboard/DashboardPage/FintechCockpit';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';
import { safeCache } from '@/lib/safe-cache';

const DAY = 86_400_000;
const TREND_DAYS = 14;
/** سقف سطرهای خوانده‌شده برای سطل‌بندی روند — از table scan بی‌مرز جلوگیری می‌کند. */
const TREND_ROW_CAP = 20_000;

const EMPTY: CockpitInsights = {
  txnTrend: new Array(TREND_DAYS).fill(0),
  txn24h: 0,
  txnPrev24h: 0,
  volume7d: 0,
  volumePrev7d: 0,
  volumeCurrency: 'AFN',
  requestFunnel: [],
  kycFunnel: [],
  dealFunnel: [],
  pendingByService: [],
};

/** Prisma Decimal | number | null → number امن. */
const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const parsed = Number(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
};

const toSegments = (rows: Array<{ key: string | null; count: number }>): CockpitSegment[] =>
  rows
    .map((row) => ({ key: row.key ?? 'UNKNOWN', count: row.count }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

const fetchInsightsRaw = async (): Promise<CockpitInsights> => {
  const now = Date.now();
  const since24 = new Date(now - DAY);
  const since48 = new Date(now - 2 * DAY);
  const since7 = new Date(now - 7 * DAY);
  const since14 = new Date(now - TREND_DAYS * DAY);

  const [txnRows, txn24h, txnPrev24h, vol7, volPrev7, requestRows, kycRows, dealRows, pendingRows] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { createdAt: { gte: since14 } },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: TREND_ROW_CAP,
      }),
      prisma.transaction.count({ where: { createdAt: { gte: since24 } } }),
      prisma.transaction.count({ where: { createdAt: { gte: since48, lt: since24 } } }),
      prisma.currencyDeal.aggregate({
        where: { status: 'COMPLETED', completedAt: { gte: since7 } },
        _sum: { fromAmount: true },
      }),
      prisma.currencyDeal.aggregate({
        where: { status: 'COMPLETED', completedAt: { gte: since14, lt: since7 } },
        _sum: { fromAmount: true },
      }),
      prisma.serviceRequest.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.customer.groupBy({ by: ['kycStatus'], _count: { _all: true } }),
      prisma.currencyDeal.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.serviceRequest.groupBy({
        by: ['serviceType'],
        where: { status: 'PENDING' },
        _count: { _all: true },
      }),
    ]);

  // سطل‌بندی روزانه: index 0 = قدیمی‌ترین روز، index 13 = امروز
  const buckets = new Array<number>(TREND_DAYS).fill(0);
  for (const row of txnRows) {
    const daysAgo = Math.floor((now - row.createdAt.getTime()) / DAY);
    if (daysAgo >= 0 && daysAgo < TREND_DAYS) {
      buckets[TREND_DAYS - 1 - daysAgo] += 1;
    }
  }

  return {
    txnTrend: buckets,
    txn24h,
    txnPrev24h,
    volume7d: toNumber(vol7._sum.fromAmount),
    volumePrev7d: toNumber(volPrev7._sum.fromAmount),
    volumeCurrency: 'AFN',
    requestFunnel: toSegments(
      requestRows.map((row) => ({ key: String(row.status), count: row._count._all })),
    ),
    kycFunnel: toSegments(
      kycRows.map((row) => ({ key: String(row.kycStatus), count: row._count._all })),
    ),
    dealFunnel: toSegments(
      dealRows.map((row) => ({ key: String(row.status), count: row._count._all })),
    ),
    pendingByService: toSegments(
      pendingRows.map((row) => ({ key: String(row.serviceType), count: row._count._all })),
    ).slice(0, 5),
  };
};

const getCachedInsights = safeCache(fetchInsightsRaw, EMPTY, {
  key: 'cockpit-insights',
  ttl: 120,
  tags: ['dashboard-stats', 'service-requests', 'currency-deals'],
});

/**
 * فقط ادمین/مالک/سوپرادمین. برای بقیه‌ی نقش‌ها fallback خالی برمی‌گردد تا
 * UI بدون نشت داده و بدون کرش، بخش‌های مربوطه را پنهان کند.
 */
export async function getCockpitInsights(): Promise<{
  success: boolean;
  data: CockpitInsights;
}> {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, data: EMPTY };

  try {
    return { success: true, data: await getCachedInsights() };
  } catch {
    return { success: false, data: EMPTY };
  }
}
