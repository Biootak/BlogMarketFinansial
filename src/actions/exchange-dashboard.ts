'use server';

/**
 * exchange-dashboard — یکپارچه‌سازی همهٔ aggregate های داشبورد صراف در یک roundtrip.
 *
 * قبلاً هر کامپوننت جداگانه به DB می‌زد. این فایل با ۸ کوئری موازی
 * همه چیز را یکجا برمی‌گرداند تا N+1 در داشبورد اتفاق نیفتد.
 *
 * Tenant isolation: requireExchangeAccess (همان access-control سایر actions).
 * اعداد BigInt به string تبدیل می‌شوند (JSON-safe).
 *
 * 2026-07-27: اولین نسخه، برای بازطراحی کامل داشبورد.
 */

import prisma from '@/lib/db';
import { requireExchangeAccess } from '@/lib/exchange-auth';
import { TX_KINDS } from '@/lib/exchange-labels';

const bigIntToStr = (v: bigint | null | undefined): string => (v == null ? '0' : v.toString());

const PERSIAN_WEEKDAY = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];

// ─── Types ───────────────────────────────────────────────────────────────────

export type DashboardKpi = {
  totalCustomers: number;
  totalTransactions: number;
  totalVolume: string;
  statsCurrency: string;
  pendingCount: number;
  todayCount: number;
  yesterdayCount: number;
  todayNewCustomers: number;
  /** حجم امروز به ارز primary (BigInt-safe string) */
  todayVolume: string;
  /** حجم دیروز به ارز primary (برای محاسبه delta) */
  yesterdayVolume: string;
  /** avg تعداد تراکنش روزانه در ۳۰ روز اخیر */
  avgDaily30d: number;
};

export type DailyPoint = {
  /** index 0 = 6 روز قبل، index 6 = امروز */
  offset: number;
  /** نام فارسی کوتاه: «شنبه» ... */
  weekdayFa: string;
  /** شماره روز ماه شمسی — ۱۴۰۵/۰۴/۲۸ → ۲۸ */
  dayLabel: string;
  count: number;
  volume: string;
};

export type CurrencyFlow = {
  currency: string;
  count: number;
  volume: string;
  /** درصد از کل volume (۰..۱) */
  share: number;
};

export type KindMix = {
  kind: string;
  count: number;
  /** درصد از کل count (۰..۱) */
  share: number;
};

export type TopCustomer = {
  id: string;
  fullName: string;
  phone: string;
  city: string | null;
  status: string;
  kycLevel: string;
  /** تعداد تراکنش در ۳۰ روز اخیر */
  txnCount: number;
  /** مجموع مبلغ (string) در ۳۰ روز اخیر */
  totalAmount: string;
  currency: string;
};

export type PendingTx = {
  id: string;
  customerName: string | null;
  amount: string;
  currency: string;
  kind: string;
  /** دقیقه از زمان ثبت (عدد صحیح) */
  ageMinutes: number;
  createdAt: string;
};

export type DashboardAlert = {
  id: string;
  kind: 'kyc-incomplete' | 'pending-stale' | 'frozen-customers' | 'high-value-pending';
  title: string;
  detail: string;
  href: string;
  tone: 'amber' | 'rose' | 'sky';
  /** عدد شاخص برای نمایش */
  metric: number;
};

export type RateSnapshot = {
  id: string;
  name: string;
  currency: string;
  displayNameFa: string | null;
  /** خرید — null اگر single rate داشته باشد */
  buyRate: string | null;
  /** فروش */
  sellRate: string | null;
  /** نرخ یکتا (برای crypto یا طلا) */
  singleRate: string | null;
  unit: string | null;
  decimals: number;
  rateType: 'BUY_SELL' | 'SINGLE' | 'BULK';
};

export type CustomerSegmentation = {
  /** تعداد کل به تفکیک status */
  byStatus: { status: string; count: number; share: number }[];
  /** تعداد به تفکیک KYC level */
  byKyc: { level: string; count: number; share: number }[];
};

export type ExchangeDashboardData = {
  exchangeId: string;
  exchangeName: string;
  primaryCurrency: string;
  city: string | null;
  kpi: DashboardKpi;
  weeklyRhythm: DailyPoint[];
  currencyFlow: CurrencyFlow[];
  transactionMix: KindMix[];
  topCustomers: TopCustomer[];
  pendingQueue: PendingTx[];
  alerts: DashboardAlert[];
  rateSnapshot: RateSnapshot[];
  customerSegmentation: CustomerSegmentation;
};

// ─── Main action ─────────────────────────────────────────────────────────────

/**
 * همهٔ aggregate های داشبورد صراف را در ۸ کوئری موازی برمی‌گرداند.
 * اگر access نداشته باشد → null (page redirect می‌کند).
 */
export async function getExchangeDashboardData(
  exchangeId: string,
): Promise<ExchangeDashboardData | null> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) return null;

  const exchange = await prisma.exchange.findUnique({
    where: { id: exchangeId },
    select: {
      name: true,
      displayName: true,
      city: true,
      primaryCurrency: true,
    },
  });
  if (!exchange) return null;

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 29);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6); // 7 روز شامل امروز

  const statsCurrency = exchange.primaryCurrency || 'AFN';

  // ── ۸ کوئری موازی ────────────────────────────────────────────────────────
  const [
    basicAggs,
    todayAgg,
    yesterdayAgg,
    last7DaysRows,
    currencyAgg,
    kindAgg,
    topCustomersRaw,
    pendingRaw,
    totalLast30d,
    pendingStaleCount,
    kycIncompleteCount,
    frozenCount,
    rateSnapshotRaw,
    customerStatusAgg,
    customerKycAgg,
  ] = await Promise.all([
    // 1) basic counts
    Promise.all([
      prisma.customer.count({ where: { exchangeId } }),
      prisma.transaction.count({ where: { exchangeId } }),
      prisma.transaction.aggregate({
        where: { exchangeId, currency: statsCurrency, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.transaction.count({ where: { exchangeId, status: 'PENDING' } }),
      prisma.transaction.count({ where: { exchangeId, createdAt: { gte: today } } }),
      prisma.transaction.count({ where: { exchangeId, createdAt: { gte: yesterday, lt: today } } }),
      prisma.customer.count({ where: { exchangeId, createdAt: { gte: today } } }),
    ]),
    // 2) today's volume (primary currency)
    prisma.transaction.aggregate({
      where: { exchangeId, currency: statsCurrency, status: 'COMPLETED', createdAt: { gte: today } },
      _sum: { amount: true },
    }),
    // 3) yesterday's volume (primary currency)
    prisma.transaction.aggregate({
      where: {
        exchangeId,
        currency: statsCurrency,
        status: 'COMPLETED',
        createdAt: { gte: yesterday, lt: today },
      },
      _sum: { amount: true },
    }),
    // 4) 7-day daily series
    prisma.transaction.findMany({
      where: { exchangeId, createdAt: { gte: weekAgo } },
      select: { createdAt: true, amount: true, currency: true },
    }),
    // 5) top currencies by volume in last 30 days
    prisma.transaction.groupBy({
      by: ['currency'],
      where: {
        exchangeId,
        status: 'COMPLETED',
        createdAt: { gte: monthAgo },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    // 6) transaction mix by kind in last 30 days
    prisma.transaction.groupBy({
      by: ['kind'],
      where: { exchangeId, createdAt: { gte: monthAgo } },
      _count: { _all: true },
    }),
    // 7) top 5 customers by txn count in 30 days
    prisma.transaction.groupBy({
      by: ['customerId'],
      where: { exchangeId, createdAt: { gte: monthAgo }, customerId: { not: null } },
      _count: { _all: true },
      _sum: { amount: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    // 8) oldest 5 pending transactions
    prisma.transaction.findMany({
      where: { exchangeId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 5,
      include: { Customer: { select: { fullName: true } } },
    }),
    // 9) count of pending transactions older than 2 hours
    (async () => {
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      return prisma.transaction.count({
        where: { exchangeId, status: 'PENDING', createdAt: { lt: twoHoursAgo } },
      });
    })(),
    // 10) customers without approved KYC
    prisma.customer.count({
      where: { exchangeId, kycStatus: { not: 'APPROVED' }, status: 'ACTIVE' },
    }),
    // 11) total transactions in last 30 days (for daily average)
    prisma.transaction.count({ where: { exchangeId, createdAt: { gte: monthAgo } } }),
    // 12) frozen customers
    prisma.customer.count({ where: { exchangeId, status: 'FROZEN' } }),
    // 13) top 6 active rates snapshot
    prisma.exchangeRate.findMany({
      where: { active: true },
      orderBy: { priority: 'asc' },
      take: 6,
      select: {
        id: true,
        name: true,
        currency: true,
        displayNameFa: true,
        buyRate: true,
        sellRate: true,
        singleRate: true,
        unit: true,
        decimals: true,
        rateType: true,
      },
    }),
    // 14) customer status segmentation
    prisma.customer.groupBy({
      by: ['status'],
      where: { exchangeId },
      _count: { _all: true },
    }),
    // 15) customer KYC level segmentation
    prisma.customer.groupBy({
      by: ['kycLevel'],
      where: { exchangeId },
      _count: { _all: true },
    }),
  ]);

  // ── آماده‌سازی داده‌ها ────────────────────────────────────────────────────
  const [
    totalCustomers,
    totalTransactions,
    volumeResult,
    pendingCount,
    todayCount,
    yesterdayCount,
    todayNewCustomers,
  ] = basicAggs;

  // 30-day average
  const avgDaily30d = Math.round(totalLast30d / 30);

  // ── Weekly rhythm: aggregate by day ────────────────────────────────────
  const dayMap = new Map<string, { count: number; volume: bigint }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { count: 0, volume: BigInt(0) });
  }
  for (const row of last7DaysRows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    const bucket = dayMap.get(key);
    if (!bucket) continue;
    bucket.count += 1;
    if (row.currency === statsCurrency) {
      bucket.volume += row.amount;
    }
  }
  const weeklyRhythm: DailyPoint[] = Array.from(dayMap.entries()).map(([key, bucket], offset) => {
    const d = new Date(key);
    return {
      offset,
      weekdayFa: PERSIAN_WEEKDAY[d.getDay()],
      dayLabel: new Intl.DateTimeFormat('fa-IR', { day: 'numeric' }).format(d),
      count: bucket.count,
      volume: bigIntToStr(bucket.volume),
    };
  });

  // ── Currency flow (top 5) ───────────────────────────────────────────────
  const totalCurrencyVolume = currencyAgg.reduce(
    (sum, c) => sum + (c._sum.amount ?? BigInt(0)),
    BigInt(0),
  );
  const currencyFlow: CurrencyFlow[] = currencyAgg
    .sort((a, b) => {
      const av = a._sum.amount ?? BigInt(0);
      const bv = b._sum.amount ?? BigInt(0);
      return bv > av ? 1 : bv < av ? -1 : 0;
    })
    .slice(0, 5)
    .map((c) => {
      const vol = c._sum.amount ?? BigInt(0);
      return {
        currency: c.currency,
        count: c._count._all,
        volume: bigIntToStr(vol),
        share: totalCurrencyVolume > 0 ? Number(vol) / Number(totalCurrencyVolume) : 0,
      };
    });

  // ── Transaction mix by kind ─────────────────────────────────────────────
  const totalMixCount = kindAgg.reduce((s, k) => s + k._count._all, 0);
  const transactionMix: KindMix[] = TX_KINDS.map((kind) => {
    const row = kindAgg.find((k) => k.kind === kind);
    return {
      kind,
      count: row?._count._all ?? 0,
      share: totalMixCount > 0 ? (row?._count._all ?? 0) / totalMixCount : 0,
    };
  }).filter((k) => k.count > 0);

  // ── Top customers (lookup) ──────────────────────────────────────────────
  const topCustomerIds = topCustomersRaw.map((t) => t.customerId).filter(Boolean) as string[];
  const customerRows = topCustomerIds.length
    ? await prisma.customer.findMany({
        where: { id: { in: topCustomerIds }, exchangeId },
        select: { id: true, fullName: true, phone: true, city: true, status: true, kycLevel: true },
      })
    : [];
  const customerMap = new Map(customerRows.map((c) => [c.id, c]));
  const topCustomers: TopCustomer[] = topCustomersRaw.map((t) => {
    const c = t.customerId ? customerMap.get(t.customerId) : null;
    return {
      id: t.customerId ?? '',
      fullName: c?.fullName ?? '—',
      phone: c?.phone ?? '',
      city: c?.city ?? null,
      status: c?.status ?? 'PROSPECT',
      kycLevel: c?.kycLevel ?? 'NONE',
      txnCount: t._count._all,
      totalAmount: bigIntToStr(t._sum.amount ?? BigInt(0)),
      currency: statsCurrency,
    };
  });

  // ── Pending queue ──────────────────────────────────────────────────────
  const pendingQueue: PendingTx[] = pendingRaw.map((p) => {
    const ageMs = now.getTime() - p.createdAt.getTime();
    return {
      id: p.id,
      customerName: p.Customer?.fullName ?? null,
      amount: bigIntToStr(p.amount),
      currency: p.currency,
      kind: p.kind,
      ageMinutes: Math.max(0, Math.floor(ageMs / 60000)),
      createdAt: p.createdAt.toISOString(),
    };
  });

  // ── Alerts ─────────────────────────────────────────────────────────────
  const alerts: DashboardAlert[] = [];
  if (kycIncompleteCount > 0) {
    alerts.push({
      id: 'kyc',
      kind: 'kyc-incomplete',
      title: 'احراز هویت ناقص',
      detail: `${new Intl.NumberFormat('fa-IR').format(kycIncompleteCount)} مشتری فعال هنوز تأیید نشده‌اند`,
      href: '/exchange/customers?status=ACTIVE',
      tone: 'amber',
      metric: kycIncompleteCount,
    });
  }
  if (pendingStaleCount > 0) {
    alerts.push({
      id: 'pending',
      kind: 'pending-stale',
      title: 'تراکنش‌های معلقه',
      detail: `${new Intl.NumberFormat('fa-IR').format(pendingStaleCount)} تراکنش بیش از ۲ ساعت در انتظار است`,
      href: '/exchange/transactions?status=PENDING',
      tone: 'rose',
      metric: pendingStaleCount,
    });
  }
  if (frozenCount > 0) {
    alerts.push({
      id: 'frozen',
      kind: 'frozen-customers',
      title: 'مشتریان مسدود',
      detail: `${new Intl.NumberFormat('fa-IR').format(frozenCount)} مشتری در وضعیت مسدود هستند`,
      href: '/exchange/customers?status=FROZEN',
      tone: 'sky',
      metric: frozenCount,
    });
  }

  const kpi: DashboardKpi = {
    totalCustomers,
    totalTransactions,
    totalVolume: bigIntToStr(volumeResult._sum.amount ?? BigInt(0)),
    statsCurrency,
    pendingCount,
    todayCount,
    yesterdayCount,
    todayNewCustomers,
    todayVolume: bigIntToStr(todayAgg._sum.amount ?? BigInt(0)),
    yesterdayVolume: bigIntToStr(yesterdayAgg._sum.amount ?? BigInt(0)),
    avgDaily30d,
  };

  // ── Rate snapshot ─────────────────────────────────────────────────────
  const rateSnapshot: RateSnapshot[] = rateSnapshotRaw.map((r) => {
    // Prisma returns Decimal for buyRate/sellRate/singleRate
    const toStr = (v: unknown): string | null => {
      if (v == null) return null;
      if (typeof v === 'string') return v;
      if (typeof v === 'number') return v.toString();
      if (typeof v === 'bigint') return v.toString();
      // Prisma.Decimal — has toString
      return (v as { toString(): string }).toString();
    };
    return {
      id: r.id,
      name: r.name,
      currency: r.currency,
      displayNameFa: r.displayNameFa,
      buyRate: toStr(r.buyRate),
      sellRate: toStr(r.sellRate),
      singleRate: toStr(r.singleRate),
      unit: r.unit,
      decimals: r.decimals,
      rateType: r.rateType,
    };
  });

  // ── Customer segmentation ─────────────────────────────────────────────
  const totalCustomersForSeg = customerStatusAgg.reduce((s, x) => s + x._count._all, 0);
  const byStatus = customerStatusAgg.map((x) => ({
    status: x.status,
    count: x._count._all,
    share: totalCustomersForSeg > 0 ? x._count._all / totalCustomersForSeg : 0,
  }));
  const totalKycForSeg = customerKycAgg.reduce((s, x) => s + x._count._all, 0);
  const byKyc = customerKycAgg.map((x) => ({
    level: x.kycLevel,
    count: x._count._all,
    share: totalKycForSeg > 0 ? x._count._all / totalKycForSeg : 0,
  }));
  const customerSegmentation: CustomerSegmentation = { byStatus, byKyc };

  // کش‌تگ‌ها در caller (createTransaction و ...) invalidate می‌شوند.

  return {
    exchangeId,
    exchangeName: exchange.displayName || exchange.name,
    primaryCurrency: statsCurrency,
    city: exchange.city,
    kpi,
    weeklyRhythm,
    currencyFlow,
    transactionMix,
    topCustomers,
    pendingQueue,
    alerts,
    rateSnapshot,
    customerSegmentation,
  };
}
