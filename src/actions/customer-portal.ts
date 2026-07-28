'use server';

/**
 * customer-portal — Server Actions برای پورتال مشتری
 *
 * هر action tenant-isolated است — customerId از session استخراج می‌شود
 * و هرگز از پارامتر بیرونی trust نمی‌شود.
 */

import { requireCustomerAccess } from '@/lib/customer-auth';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { safeCache } from '@/lib/safe-cache';
import type {
  AccountStatus,
  AccountType,
  CustomerStatus,
  KycLevel,
  KycStatus,
  TransactionKind,
  TransactionStatus,
} from '@prisma/client';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CustomerProfile = {
  id: string;
  fullName: string;
  fatherName: string | null;
  nationalId: string | null;
  passportNo: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  address: string | null;
  status: CustomerStatus;
  kycLevel: KycLevel;
  kycStatus: KycStatus;
  riskScore: number;
  personalLimitAf: number | null;
  createdAt: Date;
  exchange: {
    id: string;
    name: string;
    city: string | null;
    phone: string | null;
    logoUrl: string | null;
    status: string;
    requireKyc: boolean;
  };
};

export type CustomerAccountDetail = {
  id: string;
  currency: string;
  balance: number;
  type: AccountType;
  status: AccountStatus;
  label: string | null;
  frozenUntil: Date | null;
  createdAt: Date;
};

export type CustomerAccountSummary = {
  id: string;
  currency: string;
  balance: number;
  type: string;
  status: string;
};

export type CustomerTransactionRow = {
  id: string;
  kind: string;
  status: string;
  amount: number;
  currency: string;
  destAmount: number | null;
  destCurrency: string | null;
  note: string | null;
  counterparty: string | null;
  createdAt: Date;
};

export type CustomerTransactionPage = {
  rows: CustomerTransactionRow[];
  total: number;
  hasMore: boolean;
};

export type CustomerKycRecord = {
  id: string;
  level: KycLevel;
  status: KycStatus;
  docType: string;
  docNumber: string | null;
  fileUrl: string | null;
  rejectReason: string | null;
  reviewedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
};

export type CustomerDashboardData = {
  profile: CustomerProfile;
  accounts: CustomerAccountSummary[];
  recentTransactions: CustomerTransactionRow[];
  stats: {
    totalTransactions: number;
    completedTransactions: number;
    pendingTransactions: number;
    failedTransactions: number;
    totalBalanceAfn: number;
    /** مجموع مبالغ واریز (AFN) در ۳۰ روز اخیر */
    deposits30dAfn: number;
    /** مجموع مبالغ برداشت (AFN) در ۳۰ روز اخیر */
    withdrawals30dAfn: number;
  };
  /** Heatmap: ۳۰ روز اخیر — هر سلول = { date, count, volume } */
  heatmap: Array<{ date: string; count: number; volume: number }>;
  /** حجم به تفکیک نوع تراکنش (۳۰ روز اخیر) */
  volumeByKind: Array<{ kind: string; count: number; volume: number }>;
  /** sparkline ۷ روز اخیر — مجموع مبالغ تراکنش‌ها روزانه */
  weeklySpark: Array<{ date: string; amount: number; count: number }>;
};

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const ProfileUpdateSchema = z.object({
  email: z.string().email('ایمیل نامعتبر است').nullable().optional(),
  city: z.string().max(80, 'شهر حداکثر ۸۰ کاراکتر').nullable().optional(),
  address: z.string().max(300, 'آدرس حداکثر ۳۰۰ کاراکتر').nullable().optional(),
});

const KycSubmitSchema = z.object({
  docType: z.enum(['NATIONAL_ID', 'PASSPORT', 'RESIDENCE_PERMIT'], {
    errorMap: () => ({ message: 'نوع مدرک نامعتبر است' }),
  }),
  docNumber: z.string().min(1, 'شماره مدرک الزامی است').max(30),
  // URL فایل توسط `/api/upload` تولید می‌شود — می‌تواند relative (مثل
  // `/uploads/kyc/...`) یا absolute باشد. فقط لازم است non-empty باشد.
  fileUrl: z
    .string()
    .min(1, 'تصویر مدرک الزامی است')
    .max(2000, 'آدرس فایل طولانی است'),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapBalance(raw: bigint): number {
  return Number(raw) / 100;
}

function mapTransaction(r: {
  id: string;
  kind: string;
  status: string;
  amount: bigint;
  currency: string;
  destAmount: bigint | null;
  destCurrency: string | null;
  note: string | null;
  counterparty: string | null;
  createdAt: Date;
}): CustomerTransactionRow {
  return {
    ...r,
    amount: mapBalance(r.amount),
    destAmount: r.destAmount ? mapBalance(r.destAmount) : null,
  };
}

// ─── READ — Customer Profile ──────────────────────────────────────────────────

export async function getCustomerProfile(): Promise<CustomerProfile | null> {
  const access = await requireCustomerAccess();
  if (!access.ok) return null;

  const row = await prisma.customer.findUnique({
    where: { id: access.customerId },
    select: {
      id: true,
      fullName: true,
      fatherName: true,
      nationalId: true,
      passportNo: true,
      phone: true,
      email: true,
      city: true,
      address: true,
      status: true,
      kycLevel: true,
      kycStatus: true,
      riskScore: true,
      personalLimitAf: true,
      createdAt: true,
      Exchange: {
        select: {
          id: true,
          name: true,
          city: true,
          phone: true,
          logoUrl: true,
          status: true,
          requireKyc: true,
        },
      },
    },
  });

  if (!row) return null;

  return {
    ...row,
    personalLimitAf: row.personalLimitAf ? mapBalance(row.personalLimitAf) : null,
    exchange: { ...row.Exchange },
  };
}

// ─── READ — Accounts ─────────────────────────────────────────────────────────

export const getCustomerAccounts = safeCache(
  async (customerId: string): Promise<CustomerAccountSummary[]> => {
    const rows = await prisma.fintechAccount.findMany({
      where: { customerId, status: { not: 'CLOSED' } },
    select: { id: true, currency: true, balance: true, type: true, status: true },
    orderBy: { createdAt: 'asc' },
  });

  return rows.map((r: { id: string; currency: string; balance: bigint; type: AccountType; status: AccountStatus }) => ({
    ...r,
    balance: mapBalance(r.balance),
    type: r.type as string,
    status: r.status as string,
  }));
},
  [],
  { key: 'customer:accounts', ttl: 30, tags: ['customer-accounts'] },
);

export async function getCustomerAccountsDetail(): Promise<CustomerAccountDetail[]> {
  const access = await requireCustomerAccess();
  if (!access.ok) return [];

  const rows = await prisma.fintechAccount.findMany({
    where: { customerId: access.customerId },
    select: {
      id: true,
      currency: true,
      balance: true,
      type: true,
      status: true,
      label: true,
      frozenUntil: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return rows.map((r) => ({
    ...r,
    balance: mapBalance(r.balance),
  }));
}

// ─── READ — Transactions ──────────────────────────────────────────────────────

export async function getCustomerRecentTransactions(limit = 10): Promise<CustomerTransactionRow[]> {
  const access = await requireCustomerAccess();
  if (!access.ok) return [];

  const rows = await prisma.transaction.findMany({
    where: { customerId: access.customerId },
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
      counterparty: true,
      createdAt: true,
    },
  });

  return rows.map(mapTransaction);
}

export async function getCustomerTransactions(opts: {
  page?: number;
  limit?: number;
  kind?: string;
  status?: string;
}): Promise<CustomerTransactionPage> {
  const access = await requireCustomerAccess();
  if (!access.ok) return { rows: [], total: 0, hasMore: false };

  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, opts.limit ?? 20);
  const skip = (page - 1) * limit;

  const VALID_KINDS = new Set<string>([
    'DEPOSIT',
    'WITHDRAWAL',
    'TRANSFER',
    'EXCHANGE',
    'FEE',
    'SETTLEMENT',
    'ADJUSTMENT',
  ]);
  const VALID_STATUSES = new Set<string>([
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'REVERSED',
    'CANCELLED',
  ]);

  const where = {
    customerId: access.customerId,
    ...(opts.kind && VALID_KINDS.has(opts.kind) ? { kind: opts.kind as TransactionKind } : {}),
    ...(opts.status && VALID_STATUSES.has(opts.status)
      ? { status: opts.status as TransactionStatus }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
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
        counterparty: true,
        createdAt: true,
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    rows: rows.map(mapTransaction),
    total,
    hasMore: skip + rows.length < total,
  };
}

// ─── READ — KYC ──────────────────────────────────────────────────────────────

export async function getCustomerKycRecords(): Promise<CustomerKycRecord[]> {
  const access = await requireCustomerAccess();
  if (!access.ok) return [];

  const rows = await prisma.kycVerification.findMany({
    where: { customerId: access.customerId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      level: true,
      status: true,
      docType: true,
      docNumber: true,
      fileUrl: true,
      rejectReason: true,
      reviewedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return rows;
}

// ─── WRITE — KYC submit ───────────────────────────────────────────────────────

export async function submitKycDocument(raw: unknown): Promise<{
  success: boolean;
  error?: string;
}> {
  const access = await requireCustomerAccess();
  if (!access.ok) return { success: false, error: access.error.message };

  const parsed = KycSubmitSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'داده نامعتبر' };
  }

  // بررسی وضعیت مشتری — KYC فقط برای PROSPECT یا ACTIVE مجاز است
  const customer = await prisma.customer.findUnique({
    where: { id: access.customerId },
    select: { status: true, kycStatus: true, exchangeId: true },
  });

  if (!customer) return { success: false, error: 'مشتری یافت نشد' };
  if (customer.status === 'FROZEN' || customer.status === 'CLOSED') {
    return { success: false, error: 'حساب شما مسدود است — با پشتیبانی تماس بگیرید' };
  }
  if (customer.kycStatus === 'PENDING') {
    return { success: false, error: 'مدارک قبلی شما هنوز در حال بررسی است' };
  }

  const { v4: createId } = await import('uuid');

  let raceBlocked = false;
  await prisma.$transaction(async (tx) => {
    // atomic check+set: فقط اگر kycStatus هنوز PENDING نباشد update می‌شود
    const updated = await tx.customer.updateMany({
      where: { id: access.customerId, kycStatus: { not: 'PENDING' } },
      data: { kycStatus: 'PENDING', updatedAt: new Date() },
    });

    if (updated.count === 0) {
      raceBlocked = true;
      return;
    }

    await tx.kycVerification.create({
      data: {
        id: createId(),
        exchangeId: customer.exchangeId,
        customerId: access.customerId,
        level: 'LEVEL_1',
        status: 'PENDING',
        docType: parsed.data.docType,
        docNumber: parsed.data.docNumber,
        fileUrl: parsed.data.fileUrl,
        updatedAt: new Date(),
      },
    });
  });

  if (raceBlocked) {
    return { success: false, error: 'مدارک قبلی شما هنوز در حال بررسی است' };
  }

  revalidateTag('customer-kyc');
  return { success: true };
}

// ─── WRITE — Profile update ───────────────────────────────────────────────────

export async function updateCustomerProfile(raw: unknown): Promise<{
  success: boolean;
  error?: string;
}> {
  const access = await requireCustomerAccess();
  if (!access.ok) return { success: false, error: access.error.message };

  const parsed = ProfileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'داده نامعتبر' };
  }

  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.email !== undefined) data.email = parsed.data.email;
  if (parsed.data.city !== undefined) data.city = parsed.data.city;
  if (parsed.data.address !== undefined) data.address = parsed.data.address;

  await prisma.customer.update({
    where: { id: access.customerId },
    data,
  });

  revalidateTag('customer-profile');
  return { success: true };
}

// ─── READ — Dashboard (combined) ─────────────────────────────────────────────

function dayKey(d: Date): string {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.toISOString().slice(0, 10);
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export async function getCustomerDashboardData(): Promise<CustomerDashboardData | null> {
  const access = await requireCustomerAccess();
  if (!access.ok) return null;

  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);

  const [profile, accounts, recentTransactions, totalAgg, completedCount, pendingCount, failedCount, last30] =
    await Promise.all([
      getCustomerProfile(),
      getCustomerAccounts(access.customerId),
      getCustomerRecentTransactions(8),
      prisma.transaction.aggregate({
        where: { customerId: access.customerId },
        _count: { _all: true },
      }),
      prisma.transaction.count({
        where: { customerId: access.customerId, status: 'COMPLETED' },
      }),
      prisma.transaction.count({
        where: { customerId: access.customerId, status: { in: ['PENDING', 'PROCESSING'] } },
      }),
      prisma.transaction.count({
        where: { customerId: access.customerId, status: { in: ['FAILED', 'CANCELLED', 'REVERSED'] } },
      }),
      prisma.transaction.findMany({
        where: { customerId: access.customerId, createdAt: { gte: since30 } },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          kind: true,
          amount: true,
          currency: true,
          createdAt: true,
        },
      }),
    ]);

  if (!profile) return null;

  const totalBalanceAfn = accounts
    .filter((a) => a.currency === 'AFN')
    .reduce((sum, a) => sum + a.balance, 0);

  // ── Build heatmap (30 days) ─────────────────────────────────────────────
  const today = startOfDay(new Date());
  const heatmapMap = new Map<string, { count: number; volume: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    heatmapMap.set(dayKey(d), { count: 0, volume: 0 });
  }
  for (const t of last30) {
    const k = dayKey(t.createdAt);
    const cur = heatmapMap.get(k);
    if (cur) {
      cur.count += 1;
      cur.volume += mapBalance(t.amount);
    }
  }
  const heatmap = Array.from(heatmapMap.entries()).map(([date, v]) => ({
    date,
    count: v.count,
    volume: Math.round(v.volume * 100) / 100,
  }));

  // ── Volume by kind (30 days) ────────────────────────────────────────────
  const kindMap = new Map<string, { count: number; volume: number }>();
  for (const t of last30) {
    const cur = kindMap.get(t.kind) ?? { count: 0, volume: 0 };
    cur.count += 1;
    cur.volume += mapBalance(t.amount);
    kindMap.set(t.kind, cur);
  }
  const volumeByKind = Array.from(kindMap.entries())
    .map(([kind, v]) => ({ kind, count: v.count, volume: Math.round(v.volume * 100) / 100 }))
    .sort((a, b) => b.count - a.count);

  // ── Weekly spark (last 7 days, total volume per day) ────────────────────
  const sparkMap = new Map<string, { amount: number; count: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    sparkMap.set(dayKey(d), { amount: 0, count: 0 });
  }
  for (const t of last30) {
    const k = dayKey(t.createdAt);
    if (!sparkMap.has(k)) continue;
    const cur = sparkMap.get(k);
    if (cur) {
      cur.amount += mapBalance(t.amount);
      cur.count += 1;
    }
  }
  const weeklySpark = Array.from(sparkMap.entries()).map(([date, v]) => ({
    date,
    amount: Math.round(v.amount * 100) / 100,
    count: v.count,
  }));

  // ── 30d totals in AFN (best-effort: only AFN txns counted) ────────────
  const deposits30dAfn = last30
    .filter((t) => t.kind === 'DEPOSIT' && t.currency === 'AFN')
    .reduce((s, t) => s + mapBalance(t.amount), 0);
  const withdrawals30dAfn = last30
    .filter((t) => t.kind === 'WITHDRAWAL' && t.currency === 'AFN')
    .reduce((s, t) => s + mapBalance(t.amount), 0);

  return {
    profile,
    accounts,
    recentTransactions,
    stats: {
      totalTransactions: totalAgg._count._all,
      completedTransactions: completedCount,
      pendingTransactions: pendingCount,
      failedTransactions: failedCount,
      totalBalanceAfn,
      deposits30dAfn: Math.round(deposits30dAfn * 100) / 100,
      withdrawals30dAfn: Math.round(withdrawals30dAfn * 100) / 100,
    },
    heatmap,
    volumeByKind,
    weeklySpark,
  };
}

// ─── Notification Types ────────────────────────────────────────────────────

export type CustomerNotification = {
  id: number;
  message: string;
  isRead: boolean;
  createdAt: Date;
};

// ─── READ — Notifications ─────────────────────────────────────────────────

export async function getCustomerNotifications(limit = 30): Promise<CustomerNotification[]> {
  const auth = await requireUser();
  if (!auth.success) return [];

  const rows = await prisma.notification.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, message: true, isRead: true, createdAt: true },
  });

  return rows;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const auth = await requireUser();
  if (!auth.success) return 0;
  return prisma.notification.count({
    where: { userId: auth.user.id, isRead: false },
  });
}

export async function markNotificationsRead(ids?: number[]): Promise<{ success: boolean }> {
  const auth = await requireUser();
  if (!auth.success) return { success: false };

  await prisma.notification.updateMany({
    where: {
      userId: auth.user.id,
      ...(ids ? { id: { in: ids } } : { isRead: false }),
    },
    data: { isRead: true },
  });

  revalidateTag('customer-notifications');
  return { success: true };
}

// ─── WRITE — Customer Request (unified) ─────────────────────────────────────
//
// درخواست‌های مشتری به صرافی (باز کردن حساب جدید، درخواست انتقال، درخواست
// رفع مسدودی، ...) — فعلاً به‌صورت یک notification با prefix «[REQUEST:TYPE]»
// ثبت می‌شوند تا:
//  1) کاربر در inbox خود تأییدیهٔ درخواست را ببیند
//  2) صرافی بتواند بعداً با همین prefix query بگیرد و لیست درخواست‌ها را
//     در پنل خود ببیند (بدون نیاز به migration DB)
//
// اگر بعداً به جدول `CustomerRequest` نیاز شد، می‌توان prefix را به FK
// تبدیل کرد — ساختار فعلی backward-compatible است.
//
const RequestTypeSchema = z.enum(
  [
    'ACCOUNT_NEW', // درخواست باز کردن حساب جدید
    'ACCOUNT_UNFREEZE', // درخواست رفع مسدودی حساب
    'TRANSFER_INITIATE', // درخواست شروع انتقال
    'LIMIT_INCREASE', // درخواست افزایش سقف تراکنش
    'OTHER', // سایر
  ],
  { errorMap: () => ({ message: 'نوع درخواست نامعتبر است' }) },
);

const CustomerRequestSchema = z.object({
  type: RequestTypeSchema,
  /** توضیح کوتاه کاربر — اختیاری ولی توصیه می‌شود */
  note: z
    .string()
    .trim()
    .max(500, 'توضیح حداکثر ۵۰۰ کاراکتر است')
    .optional()
    .or(z.literal('')),
  /** مقادیر اضافی بر اساس نوع (مثلاً currency برای ACCOUNT_NEW، amount برای TRANSFER) */
  payload: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

const REQUEST_TYPE_LABEL: Record<z.infer<typeof RequestTypeSchema>, string> = {
  ACCOUNT_NEW: 'باز کردن حساب جدید',
  ACCOUNT_UNFREEZE: 'رفع مسدودی حساب',
  TRANSFER_INITIATE: 'شروع انتقال',
  LIMIT_INCREASE: 'افزایش سقف تراکنش',
  OTHER: 'سایر',
};

export type CustomerRequestType = z.infer<typeof RequestTypeSchema>;

export async function createCustomerRequest(
  raw: unknown,
): Promise<{ success: boolean; error?: string; requestId?: number }> {
  const access = await requireCustomerAccess();
  if (!access.ok) return { success: false, error: access.error.message };

  const parsed = CustomerRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'داده نامعتبر' };
  }

  if (access.customerStatus === 'CLOSED' || access.customerStatus === 'FROZEN') {
    return {
      success: false,
      error: 'حساب شما در وضعیت فعلی اجازهٔ ارسال درخواست ندارد. با پشتیبانی تماس بگیرید.',
    };
  }

  const typeLabel = REQUEST_TYPE_LABEL[parsed.data.type];

  // ساخت message با prefix ساختاریافته تا:
  //  1) کاربر در inbox پیام را بفهمد
  //  2) صرافی بتواند با regex prefix را parse کند
  const prefix = `[REQUEST:${parsed.data.type}]`;
  const note = parsed.data.note?.trim() ?? '';
  const payloadJson = parsed.data.payload
    ? `\n${JSON.stringify(parsed.data.payload, null, 0)}`
    : '';
  const message = `${prefix} ${typeLabel}${note ? ` — ${note}` : ''}${payloadJson}`;

  // ایجاد notification برای کاربر (تأییدیهٔ درخواست) و صرافی (در inbox)
  // — فعلاً یک notification برای خود کاربر ثبت می‌کنیم تا در inbox
  //   تأییدیهٔ درخواست را ببیند. صرافی بعداً می‌تواند با همین prefix
  //   از notification های exchange-level query بگیرد.
  const created = await prisma.notification.create({
    data: {
      userId: access.userId,
      message,
      isRead: false,
    },
  });

  revalidateTag('customer-notifications');
  return { success: true, requestId: created.id };
}

// ─── READ — Transaction Detail ────────────────────────────────────────────

export type CustomerTransactionDetail = CustomerTransactionRow & {
  fee: number;
  externalRef: string | null;
  rate: number | null;
  updatedAt: Date;
};

export async function getCustomerTransactionById(
  txnId: string,
): Promise<CustomerTransactionDetail | null> {
  const access = await requireCustomerAccess();
  if (!access.ok) return null;

  const row = await prisma.transaction.findFirst({
    where: { id: txnId, customerId: access.customerId },
    select: {
      id: true,
      kind: true,
      status: true,
      amount: true,
      currency: true,
      destAmount: true,
      destCurrency: true,
      note: true,
      counterparty: true,
      fee: true,
      externalRef: true,
      rate: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!row) return null;

  return {
    ...row,
    amount: mapBalance(row.amount),
    destAmount: row.destAmount ? mapBalance(row.destAmount) : null,
    fee: mapBalance(row.fee),
  };
}

// ─── READ — Account Detail (single) ──────────────────────────────────────

export async function getCustomerAccountById(
  accountId: string,
): Promise<CustomerAccountDetail | null> {
  const access = await requireCustomerAccess();
  if (!access.ok) return null;

  const row = await prisma.fintechAccount.findFirst({
    where: { id: accountId, customerId: access.customerId },
    select: {
      id: true,
      currency: true,
      balance: true,
      type: true,
      status: true,
      label: true,
      frozenUntil: true,
      createdAt: true,
    },
  });

  if (!row) return null;
  return { ...row, balance: mapBalance(row.balance) };
}

export async function getAccountLedger(
  accountId: string,
  limit = 20,
): Promise<
  Array<{
    id: string;
    direction: string;
    amount: number;
    currency: string;
    runningBalance: number;
    description: string | null;
    createdAt: Date;
  }>
> {
  const access = await requireCustomerAccess();
  if (!access.ok) return [];

  // اطمینان از تعلق account به این customer
  const account = await prisma.fintechAccount.findFirst({
    where: { id: accountId, customerId: access.customerId },
    select: { id: true },
  });
  if (!account) return [];

  const rows = await prisma.ledgerEntry.findMany({
    where: { accountId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      direction: true,
      amount: true,
      currency: true,
      runningBalance: true,
      description: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({
    ...r,
    amount: mapBalance(r.amount),
    runningBalance: mapBalance(r.runningBalance),
  }));
}
