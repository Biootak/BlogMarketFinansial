'use server';

/**
 * exchange-customers — Server Actions برای مدیریت مشتریان هر صراف.
 *
 * Tenant isolation: هر action نیازمند exchangeId است و دسترسی چک می‌شود.
 *
 * P0-5: nationalId قبل از ذخیره با SHA-256 هش می‌شود (حفظ حریم خصوصی)
 * P3-1: mapCustomer() type-safe به جای as unknown as CustomerRow
 * P3-2: personalLimitAf در CustomerRow از bigint به string تبدیل شد (JSON-safe)
 */

import { createHash } from 'node:crypto';
import prisma from '@/lib/db';
import { requireExchangeAccess } from '@/lib/exchange-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// ─── Helper: هش کردن شناسه ملی (P0-5) ────────────────────────────────────────
// SHA-256 یک‌طرفه — نه قابل بازیابی نه قابل مقایسه متنی.
// مثال: "1234567890" → "a665a45920422f9d417e4867efdc4fb8a0..."
// برای search: ورودی کاربر را هش کن و با هش ذخیره‌شده مقایسه کن.
function hashNationalId(id: string): string {
  return createHash('sha256').update(id.trim()).digest('hex');
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const CustomerSchema = z.object({
  fullName: z.string().min(2, 'نام حداقل ۲ کاراکتر').max(120),
  fatherName: z.string().max(80).nullable().optional(),
  nationalId: z.string().max(20).nullable().optional(),
  passportNo: z.string().max(30).nullable().optional(),
  phone: z.string().min(7, 'شماره تلفن نامعتبر').max(25),
  email: z.string().email('ایمیل نامعتبر').nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  personalLimitAf: z.number().int().min(0).nullable().optional(),
  // Extended fields (P2026: برای customer cockpit)
  status: z.enum(['PROSPECT', 'ACTIVE', 'FROZEN', 'CLOSED']).optional(),
  kycLevel: z.enum(['NONE', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3']).optional(),
  kycStatus: z.enum(['NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']).optional(),
  riskScore: z.number().int().min(0).max(100).optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CustomerRow = {
  id: string;
  exchangeId: string;
  fullName: string;
  fatherName: string | null;
  /** هش SHA-256 کد ملی — برای نمایش در UI باید null یا '[محافظت‌شده]' نشان داده شود */
  nationalId: string | null;
  passportNo: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  status: string;
  kycLevel: string;
  kycStatus: string;
  /** P3-2: string به جای bigint — JSON-serializable و قابل پاس به client components */
  personalLimitAf: string | null;
  riskScore: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ─── CACHE / READ TYPES (for new analytics queries) ─────────────────────────

export type CustomerStats = {
  total: number;
  active: number;
  prospect: number;
  frozen: number;
  closed: number;
  /** 7d growth — new customers in last 7 days */
  newLast7d: number;
  /** 30d growth — new customers in last 30 days */
  newLast30d: number;
  /** activation rate: ACTIVE / total (0..1) */
  activationRate: number;
  /** KYC approved count */
  kycApproved: number;
  /** KYC pending count */
  kycPending: number;
  /** Number of high-risk customers (riskScore > 70) */
  highRisk: number;
  /** Number of medium-risk (40 < riskScore <= 70) */
  mediumRisk: number;
  /** Number of low-risk (<= 40) */
  lowRisk: number;
  /** average risk score */
  avgRisk: number;
  /** by city: { city, count }[] */
  topCities: { city: string; count: number }[];
};

export type CustomerSegment = {
  id: string;
  label: string;
  count: number;
  share: number;
  tone: 'emerald' | 'amber' | 'rose' | 'sky' | 'muted';
};

export type CustomerTopRow = {
  id: string;
  fullName: string;
  phone: string;
  city: string | null;
  status: string;
  kycLevel: string;
  riskScore: number;
  txnCount: number;
  totalVolume: string; // BigInt → string (JSON-safe)
  lastTxnAt: string | null;
};

export type CustomerRiskBucket = {
  bucket: 'low' | 'medium' | 'high';
  label: string;
  count: number;
  share: number;
  tone: 'emerald' | 'amber' | 'rose';
};

export type CustomerActivityPulse = {
  /** آخرین ۱۴ روز — روزانه count (شامل 0) */
  daily: { dayLabel: string; count: number; volume: string }[];
  /** مجموع تراکنش‌های ۱۴ روز اخیر */
  total14d: number;
  /** نسبت به ۱۴ روز قبل — رشد درصد */
  growthPct: number;
};

export type CustomerAccountsSummary = {
  /** تعداد حساب‌های فعال */
  activeCount: number;
  /** مجموع موجودی به ارز primary (string) */
  totalBalance: string;
  /** primary currency */
  primaryCurrency: string;
  /** per currency balance */
  byCurrency: { currency: string; balance: string; count: number }[];
};

export type CustomerTimelineEntry = {
  id: string;
  kind: string;
  status: string;
  amount: string;
  currency: string;
  destAmount: string | null;
  destCurrency: string | null;
  note: string | null;
  createdAt: string;
};

// ─── mapCustomer: type-safe mapper (P3-1) ─────────────────────────────────────
type PrismaCustomer = {
  id: string;
  exchangeId: string;
  fullName: string;
  fatherName: string | null;
  nationalId: string | null;
  passportNo: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  status: string;
  kycLevel: string;
  kycStatus: string;
  personalLimitAf: bigint | null;
  riskScore: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapCustomer(row: PrismaCustomer): CustomerRow {
  return {
    id: row.id,
    exchangeId: row.exchangeId,
    fullName: row.fullName,
    fatherName: row.fatherName,
    nationalId: row.nationalId, // هش ذخیره‌شده — نه plain text
    passportNo: row.passportNo,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    status: row.status,
    kycLevel: row.kycLevel,
    kycStatus: row.kycStatus,
    personalLimitAf: row.personalLimitAf != null ? row.personalLimitAf.toString() : null,
    riskScore: row.riskScore,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ─── READ ─────────────────────────────────────────────────────────────────────

export async function getCustomers(
  exchangeId: string,
  opts?: { query?: string; status?: string; limit?: number; offset?: number },
): Promise<{ rows: CustomerRow[]; total: number }> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) return { rows: [], total: 0 };

  const statusValue = opts?.status && opts.status !== 'all' ? opts.status : undefined;
  const where = {
    exchangeId,
    ...(statusValue ? { status: statusValue as 'PROSPECT' | 'ACTIVE' | 'FROZEN' | 'CLOSED' } : {}),
    ...(opts?.query
      ? {
          OR: [
            { fullName: { contains: opts.query, mode: 'insensitive' as const } },
            { phone: { contains: opts.query } },
            // P0-5: search روی هش — ورودی کاربر را قبل از مقایسه هش کن
            { nationalId: { equals: hashNationalId(opts.query) } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts?.limit ?? 50,
      skip: opts?.offset ?? 0,
    }),
    prisma.customer.count({ where }),
  ]);

  return { rows: rows.map(mapCustomer), total };
}

export async function getCustomerById(
  exchangeId: string,
  customerId: string,
): Promise<CustomerRow | null> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) return null;

  const row = await prisma.customer.findFirst({
    where: { id: customerId, exchangeId },
  });
  return row ? mapCustomer(row) : null;
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createCustomer(
  exchangeId: string,
  raw: unknown,
): Promise<FintechActionResult<CustomerRow>> {
  // G7-fix: ساختن مشتری نیاز به write-access دارد — VIEWER مجاز نیست
  const access = await requireExchangeAccess(exchangeId, true);
  if (!access.ok)
    return { success: false, error: { code: access.error.code, message: access.error.message } };

  const parsed = CustomerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'داده نامعتبر' },
    };
  }

  const { nationalId, ...restData } = parsed.data;
  const row = await prisma.customer.create({
    data: {
      id: createId(),
      exchangeId,
      ...restData,
      // P0-5: هش کردن nationalId — plain text هرگز به DB نمی‌رسد
      nationalId: nationalId ? hashNationalId(nationalId) : null,
      personalLimitAf: parsed.data.personalLimitAf ? BigInt(parsed.data.personalLimitAf) : null,
      updatedAt: new Date(),
      createdById: access.userId,
    },
  });

  revalidateTag(`exchange-customers-${exchangeId}`);
  return { success: true, data: mapCustomer(row) };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateCustomer(
  exchangeId: string,
  customerId: string,
  raw: unknown,
): Promise<FintechActionResult<CustomerRow>> {
  // G7-fix: ویرایش مشتری نیاز به write-access دارد — VIEWER مجاز نیست
  const access = await requireExchangeAccess(exchangeId, true);
  if (!access.ok)
    return { success: false, error: { code: access.error.code, message: access.error.message } };

  const parsed = CustomerSchema.partial().safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'داده نامعتبر' },
    };
  }

  const { nationalId: newNationalId, ...restUpdate } = parsed.data;
  const row = await prisma.customer.update({
    where: { id: customerId, exchangeId },
    data: {
      ...restUpdate,
      // P0-5: اگر nationalId جدید داده شده، هش کن
      ...(newNationalId !== undefined
        ? { nationalId: newNationalId ? hashNationalId(newNationalId) : null }
        : {}),
      ...(parsed.data.personalLimitAf !== undefined
        ? {
            personalLimitAf: parsed.data.personalLimitAf
              ? BigInt(parsed.data.personalLimitAf)
              : null,
          }
        : {}),
      updatedAt: new Date(),
    },
  });

  revalidateTag(`exchange-customers-${exchangeId}`);
  return { success: true, data: mapCustomer(row) };
}

// ─── STATUS ───────────────────────────────────────────────────────────────────

export async function setCustomerStatus(
  exchangeId: string,
  customerId: string,
  status: 'PROSPECT' | 'ACTIVE' | 'FROZEN' | 'CLOSED',
): Promise<FintechActionResult<{ id: string; status: string }>> {
  // G3-fix: تغییر وضعیت مشتری (freeze/close) نیاز به write-access دارد — VIEWER مجاز نیست
  const access = await requireExchangeAccess(exchangeId, true);
  if (!access.ok)
    return { success: false, error: { code: access.error.code, message: access.error.message } };

  const row = await prisma.customer.update({
    where: { id: customerId, exchangeId },
    data: { status, updatedAt: new Date() },
    select: { id: true, status: true },
  });

  revalidateTag(`exchange-customers-${exchangeId}`);
  return { success: true, data: row };
}

// ─── ANALYTICS: stats برای Cockpit (status, KYC, risk, city) ─────────────────

/**
 * getCustomerStats — aggregate آماری کل مشتریان یک صراف.
 *
 * خروجی شامل KPI و سگمنت‌ها برای نمایش در Hero + side rail.
 * همه کوئری‌ها موازی اجرا می‌شوند تا یک roundtrip باشد.
 */
export async function getCustomerStats(exchangeId: string): Promise<CustomerStats> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) {
    return {
      total: 0,
      active: 0,
      prospect: 0,
      frozen: 0,
      closed: 0,
      newLast7d: 0,
      newLast30d: 0,
      activationRate: 0,
      kycApproved: 0,
      kycPending: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
      avgRisk: 0,
      topCities: [],
    };
  }

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const last7d = new Date(today);
  last7d.setDate(last7d.getDate() - 6);
  const last30d = new Date(today);
  last30d.setDate(last30d.getDate() - 29);

  const [statusAggs, kycAggs, riskAgg, newAggs, cityAgg] = await Promise.all([
    prisma.customer.groupBy({
      by: ['status'],
      where: { exchangeId },
      _count: { _all: true },
    }),
    prisma.customer.groupBy({
      by: ['kycStatus'],
      where: { exchangeId },
      _count: { _all: true },
    }),
    prisma.customer.aggregate({
      where: { exchangeId },
      _avg: { riskScore: true },
      _count: {
        _all: true,
      },
    }),
    Promise.all([
      prisma.customer.count({ where: { exchangeId, createdAt: { gte: last7d } } }),
      prisma.customer.count({ where: { exchangeId, createdAt: { gte: last30d } } }),
    ]),
    prisma.customer.groupBy({
      by: ['city'],
      where: { exchangeId, city: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { city: 'desc' } },
      take: 5,
    }),
  ]);

  const byStatus = new Map(statusAggs.map((s) => [s.status, s._count._all]));
  const byKyc = new Map(kycAggs.map((k) => [k.kycStatus, k._count._all]));

  const total = riskAgg._count._all;
  const avgRisk = riskAgg._avg.riskScore ?? 0;

  const allCustomersForRisk = await prisma.customer.findMany({
    where: { exchangeId },
    select: { riskScore: true },
  });
  let highRisk = 0;
  let mediumRisk = 0;
  let lowRisk = 0;
  for (const c of allCustomersForRisk) {
    if (c.riskScore > 70) highRisk += 1;
    else if (c.riskScore > 40) mediumRisk += 1;
    else lowRisk += 1;
  }

  const [newLast7d, newLast30d] = newAggs;
  const active = byStatus.get('ACTIVE') ?? 0;

  return {
    total,
    active,
    prospect: byStatus.get('PROSPECT') ?? 0,
    frozen: byStatus.get('FROZEN') ?? 0,
    closed: byStatus.get('CLOSED') ?? 0,
    newLast7d,
    newLast30d,
    activationRate: total > 0 ? active / total : 0,
    kycApproved: byKyc.get('APPROVED') ?? 0,
    kycPending: byKyc.get('PENDING') ?? 0,
    highRisk,
    mediumRisk,
    lowRisk,
    avgRisk: Math.round(avgRisk),
    topCities: cityAgg.map((c) => ({
      city: c.city ?? '—',
      count: c._count._all,
    })),
  };
}

/**
 * getCustomerSegments — segments بر اساس status (ACTIVE/PROSPECT/FROZEN/CLOSED).
 * هر segment یک tone و share دارد.
 */
export async function getCustomerSegments(exchangeId: string): Promise<CustomerSegment[]> {
  const stats = await getCustomerStats(exchangeId);
  const segs: Omit<CustomerSegment, 'share' | 'count' | 'tone' | 'id'>[] = [
    { label: 'فعال' },
    { label: 'احتمالی' },
    { label: 'مسدود' },
    { label: 'بسته' },
  ];
  const counts = [stats.active, stats.prospect, stats.frozen, stats.closed];
  const tones: CustomerSegment['tone'][] = ['emerald', 'amber', 'rose', 'muted'];
  const ids = ['ACTIVE', 'PROSPECT', 'FROZEN', 'CLOSED'];
  return segs.map((s, i) => ({
    id: ids[i] ?? 'CLOSED',
    label: s.label,
    count: counts[i] ?? 0,
    share: stats.total > 0 ? (counts[i] ?? 0) / stats.total : 0,
    tone: tones[i] ?? 'muted',
  }));
}

/**
 * getCustomerRiskDistribution — توزیع ریسک در ۳ سطل.
 */
export async function getCustomerRiskDistribution(
  exchangeId: string,
): Promise<CustomerRiskBucket[]> {
  const stats = await getCustomerStats(exchangeId);
  const buckets: Omit<CustomerRiskBucket, 'share' | 'count'>[] = [
    { bucket: 'low', label: 'کم‌ریسک', tone: 'emerald' },
    { bucket: 'medium', label: 'متوسط', tone: 'amber' },
    { bucket: 'high', label: 'پرریسک', tone: 'rose' },
  ];
  const counts = [stats.lowRisk, stats.mediumRisk, stats.highRisk];
  return buckets.map((b, i) => ({
    ...b,
    count: counts[i] ?? 0,
    share: stats.total > 0 ? (counts[i] ?? 0) / stats.total : 0,
  }));
}

/**
 * getTopCustomers — پنج مشتری برتر بر اساس حجم تراکنش ۳۰ روز اخیر.
 * همراه با اطلاعات آخرین تراکنش.
 */
export async function getTopCustomers(exchangeId: string, limit = 5): Promise<CustomerTopRow[]> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) return [];

  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 29);

  // group by customerId to get top customers
  const grouped = await prisma.transaction.groupBy({
    by: ['customerId'],
    where: {
      exchangeId,
      createdAt: { gte: monthAgo },
      customerId: { not: null },
      status: 'COMPLETED',
    },
    _count: { _all: true },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: limit,
  });

  const customerIds = grouped.map((g) => g.customerId).filter(Boolean) as string[];
  if (customerIds.length === 0) return [];

  const [customers, lastTxns] = await Promise.all([
    prisma.customer.findMany({
      where: { id: { in: customerIds }, exchangeId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        city: true,
        status: true,
        kycLevel: true,
        riskScore: true,
      },
    }),
    prisma.transaction.groupBy({
      by: ['customerId'],
      where: {
        exchangeId,
        customerId: { in: customerIds },
        status: 'COMPLETED',
      },
      _max: { createdAt: true },
    }),
  ]);

  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const lastTxnMap = new Map(
    lastTxns.map((l) => [l.customerId ?? '', l._max.createdAt?.toISOString() ?? null]),
  );

  return grouped
    .map((g) => {
      const c = g.customerId ? customerMap.get(g.customerId) : null;
      if (!c) return null;
      return {
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        city: c.city,
        status: c.status as string,
        kycLevel: c.kycLevel as string,
        riskScore: c.riskScore,
        txnCount: g._count._all,
        totalVolume: (g._sum.amount ?? BigInt(0)).toString(),
        lastTxnAt: lastTxnMap.get(c.id) ?? null,
      };
    })
    .filter((x): x is CustomerTopRow => x !== null);
}

/**
 * getCustomerActivityPulse — فعالیت ۱۴ روز اخیر همه مشتریان (نمودار پای hero).
 */
export async function getCustomerActivityPulse(exchangeId: string): Promise<CustomerActivityPulse> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) {
    return { daily: [], total14d: 0, growthPct: 0 };
  }

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const last14d = new Date(today);
  last14d.setDate(last14d.getDate() - 13);
  const prior14d = new Date(today);
  prior14d.setDate(prior14d.getDate() - 27);
  const splitDate = new Date(today);
  splitDate.setDate(splitDate.getDate() - 14);

  const [recentRows, priorRows, exchange] = await Promise.all([
    prisma.transaction.findMany({
      where: { exchangeId, createdAt: { gte: last14d } },
      select: { createdAt: true, amount: true, currency: true },
    }),
    prisma.transaction.count({
      where: { exchangeId, createdAt: { gte: prior14d, lt: splitDate } },
    }),
    prisma.exchange.findUnique({
      where: { id: exchangeId },
      select: { primaryCurrency: true },
    }),
  ]);
  const primaryCurrency = exchange?.primaryCurrency ?? 'AFN';

  // 14 day buckets
  const buckets = new Map<string, { count: number; volume: bigint }>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(last14d);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { count: 0, volume: BigInt(0) });
  }
  for (const r of recentRows) {
    const key = r.createdAt.toISOString().slice(0, 10);
    const b = buckets.get(key);
    if (!b) continue;
    b.count += 1;
    if (r.currency === primaryCurrency) b.volume += r.amount;
  }

  const daily = Array.from(buckets.entries()).map(([key, b]) => {
    const d = new Date(key);
    return {
      dayLabel: new Intl.DateTimeFormat('fa-IR', { day: 'numeric' }).format(d),
      count: b.count,
      volume: b.volume.toString(),
    };
  });

  const total14d = recentRows.length;
  const growthPct = priorRows > 0 ? Math.round(((total14d - priorRows) / priorRows) * 100) : 0;

  return { daily, total14d, growthPct };
}

// ─── DETAIL: اطلاعات تکمیلی برای صفحهٔ پروفایل ───────────────────────────────

/**
 * getCustomerAccountsSummary — خلاصهٔ حساب‌های یک مشتری (FintechAccount).
 */
export async function getCustomerAccountsSummary(
  exchangeId: string,
  customerId: string,
): Promise<CustomerAccountsSummary> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) {
    return { activeCount: 0, totalBalance: '0', primaryCurrency: 'AFN', byCurrency: [] };
  }

  const [exchange, accounts] = await Promise.all([
    prisma.exchange.findUnique({
      where: { id: exchangeId },
      select: { primaryCurrency: true },
    }),
    prisma.fintechAccount.findMany({
      where: { exchangeId, customerId },
      select: { currency: true, balance: true, status: true },
    }),
  ]);

  const primaryCurrency = exchange?.primaryCurrency ?? 'AFN';
  const active = accounts.filter((a) => a.status === 'ACTIVE');

  // group by currency
  const byCurrencyMap = new Map<string, { balance: bigint; count: number }>();
  for (const a of active) {
    const cur = byCurrencyMap.get(a.currency) ?? { balance: BigInt(0), count: 0 };
    cur.balance += a.balance;
    cur.count += 1;
    byCurrencyMap.set(a.currency, cur);
  }
  const byCurrency = Array.from(byCurrencyMap.entries())
    .map(([currency, v]) => ({
      currency,
      balance: v.balance.toString(),
      count: v.count,
    }))
    .sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1));

  const totalBalance = byCurrencyMap.get(primaryCurrency)?.balance.toString() ?? '0';

  return {
    activeCount: active.length,
    totalBalance,
    primaryCurrency,
    byCurrency,
  };
}

/**
 * getCustomerTimeline — timeline تراکنش‌های یک مشتری (با destAmount و status).
 */
export async function getCustomerTimeline(
  exchangeId: string,
  customerId: string,
  limit = 20,
): Promise<CustomerTimelineEntry[]> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) return [];

  const rows = await prisma.transaction.findMany({
    where: { exchangeId, customerId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      kind: true,
      status: true,
      amount: true,
      currency: true,
      destAmount: true,
      destCurrency: true,
      note: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    status: r.status,
    amount: r.amount.toString(),
    currency: r.currency,
    destAmount: r.destAmount?.toString() ?? null,
    destCurrency: r.destCurrency ?? null,
    note: r.note ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

// ─── BULK: تغییر وضعیت گروهی ────────────────────────────────────────────────

/**
 * bulkSetCustomerStatus — تغییر وضعیت گروهی (فقط OWNER/MANAGER/STAFF).
 */
export async function bulkSetCustomerStatus(
  exchangeId: string,
  customerIds: string[],
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED' | 'PROSPECT',
): Promise<FintechActionResult<{ count: number }>> {
  const access = await requireExchangeAccess(exchangeId, true);
  if (!access.ok)
    return { success: false, error: { code: access.error.code, message: access.error.message } };

  if (customerIds.length === 0) {
    return { success: false, error: { code: 'EMPTY', message: 'هیچ مشتری انتخاب نشده است' } };
  }
  if (customerIds.length > 200) {
    return {
      success: false,
      error: { code: 'TOO_MANY', message: 'حداکثر ۲۰۰ مشتری در یک عملیات' },
    };
  }

  const result = await prisma.customer.updateMany({
    where: { id: { in: customerIds }, exchangeId },
    data: { status, updatedAt: new Date() },
  });

  revalidateTag(`exchange-customers-${exchangeId}`);
  return { success: true, data: { count: result.count } };
}

// ─── ALIASES — Compatibility layer for new cockpit UI ─────────────────────

/** alias برای cockpit UI — همان createCustomer با type-safe payload. */
export async function createCustomerAction(
  exchangeId: string,
  raw: unknown,
): Promise<FintechActionResult<CustomerRow>> {
  return createCustomer(exchangeId, raw);
}

/** alias برای cockpit UI — همان updateCustomer. */
export async function updateCustomerAction(
  exchangeId: string,
  customerId: string,
  raw: unknown,
): Promise<FintechActionResult<CustomerRow>> {
  return updateCustomer(exchangeId, customerId, raw);
}

/** alias برای cockpit UI — تغییر وضعیت یک مشتری. */
export async function setCustomerStatusAction(
  exchangeId: string,
  customerId: string,
  status: 'PROSPECT' | 'ACTIVE' | 'FROZEN' | 'CLOSED',
): Promise<FintechActionResult<{ id: string; status: string }>> {
  return setCustomerStatus(exchangeId, customerId, status);
}

/** alias کوتاه‌تر برای استفاده در client components. */
export type Customer = CustomerRow;
