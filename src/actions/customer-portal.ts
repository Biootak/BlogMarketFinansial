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
    totalBalanceAfn: number;
  };
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
  fileUrl: z
    .string()
    .url('آدرس فایل نامعتبر است')
    .startsWith('https://', 'آدرس فایل باید HTTPS باشد'),
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

    return rows.map((r) => ({
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

export async function getCustomerDashboardData(): Promise<CustomerDashboardData | null> {
  const access = await requireCustomerAccess();
  if (!access.ok) return null;

  const [profile, accounts, recentTransactions, stats, completedCount] = await Promise.all([
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
  ]);

  if (!profile) return null;

  const totalBalanceAfn = accounts
    .filter((a) => a.currency === 'AFN')
    .reduce((sum, a) => sum + a.balance, 0);

  return {
    profile,
    accounts,
    recentTransactions,
    stats: {
      totalTransactions: stats._count._all,
      completedTransactions: completedCount,
      totalBalanceAfn,
    },
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
