'use server';

/**
 * customer-portal — Server Actions برای پورتال مشتری
 *
 * هر action tenant-isolated است — customerId از session استخراج می‌شود
 * و هرگز از پارامتر بیرونی trust نمی‌شود.
 */

import { randomBytes } from 'node:crypto';
import { getExchangeForUser } from '@/actions/exchanges';
import { requireCustomerAccess } from '@/lib/customer-auth';
import prisma from '@/lib/db';
import {
  isHighValueTransaction,
  requestTransactionOtp,
  verifyTransactionOtp,
} from '@/lib/fintech/transaction-guard';
import { assertOutgoingKycLimit } from '@/lib/kyc-limits';
import { computeKycProgression } from '@/lib/kyc-progression';
import { isPhoneValid, normalizeToE164 } from '@/lib/phone-validation';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requirePermission, requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { safeCache } from '@/lib/safe-cache';
import { consumeOtpToken } from '@/lib/tokens';
import type { FintechActionResult } from '@/types/types';
import {
  type AccountStatus,
  type AccountType,
  type CustomerStatus,
  type KycLevel,
  type KycStatus,
  Prisma,
  type TransactionKind,
  type TransactionStatus,
} from '@prisma/client';
import { cache } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
    /** M1-fix: slug برای لینک صحیح به صفحهٔ عمومی صرافی (/exchanges/[slug]) */
    slug: string | null;
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

/**
 * KYC سطح‌بندی‌شده به انتخاب کاربر (tiered KYC — مطابق الگوی FATF):
 *  - LEVEL_1: تأیید موبایل با تلگرام (OTP) — اکشن جدا: submitKycPhone
 *  - LEVEL_2: مدرک هویتی + سلفی تأیید چهره
 *  - LEVEL_3: + شهر/آدرس (سند آدرس) + صورت حساب بانکی
 */
const KycSubmitSchema = z
  .object({
    level: z.enum(['LEVEL_2', 'LEVEL_3'], {
      errorMap: () => ({ message: 'سطح احراز هویت نامعتبر است' }),
    }),
    docType: z.enum(['NATIONAL_ID', 'PASSPORT', 'RESIDENCE_PERMIT'], {
      errorMap: () => ({ message: 'نوع مدرک نامعتبر است' }),
    }),
    docNumber: z.string().min(1, 'شماره مدرک الزامی است').max(30),
    // URL فایل توسط `/api/upload` تولید می‌شود — می‌تواند relative (مثل
    // `/uploads/kyc/...`) یا absolute باشد. فقط لازم است non-empty باشد.
    fileUrl: z.string().min(1, 'تصویر مدرک الزامی است').max(2000, 'آدرس فایل طولانی است'),
    // سطح ۲ و ۳: سلفی تأیید چهره الزامی است
    selfieUrl: z
      .string()
      .min(1, 'برای این سطح، سلفی (تأیید چهره) الزامی است')
      .max(2000, 'آدرس فایل طولانی است'),
    // سطح ۳: آدرس + صورت حساب بانکی
    city: z.string().max(120, 'شهر حداکثر ۱۲۰ کاراکتر').optional(),
    address: z.string().max(300, 'آدرس حداکثر ۳۰۰ کاراکتر').optional(),
    addressDocUrl: z.string().max(2000, 'آدرس فایل طولانی است').optional(),
    bankStatementUrl: z.string().max(2000, 'آدرس فایل طولانی است').optional(),
  })
  .superRefine((val, ctx) => {
    if (val.level === 'LEVEL_3') {
      if (!val.city) {
        ctx.addIssue({ code: 'custom', path: ['city'], message: 'برای سطح ۳، شهر الزامی است' });
      }
      if (!val.address) {
        ctx.addIssue({ code: 'custom', path: ['address'], message: 'برای سطح ۳، آدرس الزامی است' });
      }
      if (!val.addressDocUrl) {
        ctx.addIssue({
          code: 'custom',
          path: ['addressDocUrl'],
          message: 'برای سطح ۳، تصویر سند اثبات آدرس الزامی است',
        });
      }
      if (!val.bankStatementUrl) {
        ctx.addIssue({
          code: 'custom',
          path: ['bankStatementUrl'],
          message: 'برای سطح ۳، تصویر صورت حساب بانکی الزامی است',
        });
      }
    }
  });

/** تأیید موبایل با تلگرام — سطح ۱ */
const KycPhoneSchema = z.object({
  phone: z.string().min(8, 'شماره موبایل نامعتبر است').max(20),
  code: z.string().min(4, 'کد تأیید نامعتبر است').max(8),
});

// intent اختصاصی تأیید موبایل — هماهنگ با phone-verify.ts
const PHONE_VERIFY_INTENT = 'service-verify' as const;

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

/**
 * Performance: cache() → در یک render pass فقط یکبار اجرا می‌شود.
 * layout.tsx و page.tsx هر دو صدا می‌زنند — فقط اولی DB query می‌کند.
 */
export const getCustomerProfile = cache(async (): Promise<CustomerProfile | null> => {
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
          // M1-fix: برای لینک صحیح به صفحهٔ عمومی صرافی
          slug: true,
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
});

// ─── READ — Accounts ─────────────────────────────────────────────────────────

export const getCustomerAccounts = safeCache(
  async (customerId: string): Promise<CustomerAccountSummary[]> => {
    const rows = await prisma.fintechAccount.findMany({
      where: { customerId, status: { not: 'CLOSED' } },
      select: { id: true, currency: true, balance: true, type: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map(
      (r: {
        id: string;
        currency: string;
        balance: bigint;
        type: AccountType;
        status: AccountStatus;
      }) => ({
        ...r,
        balance: mapBalance(r.balance),
        type: r.type as string,
        status: r.status as string,
      }),
    );
  },
  [],
  { key: 'customer:accounts', ttl: 30, tags: ['customer-accounts'] },
);

const _getCustomerAccountsDetailCached = safeCache(
  async (customerId: string): Promise<CustomerAccountDetail[]> => {
    const rows = await prisma.fintechAccount.findMany({
      where: { customerId },
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
  },
  [],
  { key: 'customer:accounts-detail', ttl: 30, tags: ['customer-accounts'] },
);

export async function getCustomerAccountsDetail(): Promise<CustomerAccountDetail[]> {
  const access = await requireCustomerAccess();
  if (!access.ok) return [];
  return _getCustomerAccountsDetailCached(access.customerId);
}

// ─── READ — Transactions ──────────────────────────────────────────────────────

const _getRecentTransactionsCached = safeCache(
  async (customerId: string, limit: number): Promise<CustomerTransactionRow[]> => {
    const rows = await prisma.transaction.findMany({
      where: { customerId },
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
  },
  [],
  { key: 'customer:recent-transactions', ttl: 30, tags: ['customer-transactions'] },
);

export async function getCustomerRecentTransactions(limit = 10): Promise<CustomerTransactionRow[]> {
  const access = await requireCustomerAccess();
  if (!access.ok) return [];
  return _getRecentTransactionsCached(access.customerId, limit);
}

export async function getCustomerTransactions(opts: {
  page?: number;
  limit?: number;
  kind?: string;
  status?: string;
  /** M7-fix: فیلتر بر اساس حساب (از تاریخچهٔ دارایی رمزارز) */
  accountId?: string;
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
    ...(opts.accountId ? { accountId: opts.accountId } : {}),
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

const _getCustomerKycRecordsCached = safeCache(
  async (customerId: string): Promise<CustomerKycRecord[]> => {
    return prisma.kycVerification.findMany({
      where: { customerId },
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
  },
  [],
  { key: 'customer:kyc-records', ttl: 60, tags: ['customer-kyc'] },
);

export async function getCustomerKycRecords(): Promise<CustomerKycRecord[]> {
  const access = await requireCustomerAccess();
  if (!access.ok) return [];
  return _getCustomerKycRecordsCached(access.customerId);
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
    select: { status: true, kycStatus: true, exchangeId: true, kycLevel: true },
  });

  if (!customer) return { success: false, error: 'مشتری یافت نشد' };
  if (customer.status === 'FROZEN' || customer.status === 'CLOSED') {
    return { success: false, error: 'حساب شما مسدود است — با پشتیبانی تماس بگیرید' };
  }

  const selectedLevel = parsed.data.level;

  // ── گیت سکوئنشی: هر سطح فقط بعد از تکمیل کامل سطح قبلی باز می‌شود ──
  // FIX (2026-08-11): گیت قبلی فقط `customer.kycLevel` را می‌سنجید. بعد از تأییدِ
  // جزئی (مثلاً مدرک APPROVED ولی سلفی REJECTED) کیک‌لول جلو رفته بود و کاربر در
  // ارسال مجدد قفل می‌شد («سطح ۲ قبلاً تأیید شده است»). حالا از computeKycProgression
  // استفاده می‌شود که مجموعهٔ کامل مدارک هر سطح را می‌سنجد؛ در نتیجه تأیید جزئی،
  // سطح را کامل حساب نمی‌کند و مسیر ارسال مجدد باز می‌ماند.
  const kycRecords = await prisma.kycVerification.findMany({
    where: { customerId: access.customerId },
    select: { level: true, docType: true, status: true },
  });
  const progression = computeKycProgression(kycRecords);

  if (selectedLevel === 'LEVEL_2') {
    if (progression.finalLevel === 'NONE') {
      return {
        success: false,
        error: 'ابتدا سطح ۱ (تأیید موبایل و تلگرام) را تکمیل کنید',
      };
    }
    if (progression.finalLevel !== 'LEVEL_1') {
      return {
        success: false,
        error: 'سطح ۲ قبلاً تأیید شده است',
      };
    }
  }
  if (selectedLevel === 'LEVEL_3') {
    if (progression.finalLevel !== 'LEVEL_2') {
      return {
        success: false,
        error:
          progression.finalLevel === 'NONE' || progression.finalLevel === 'LEVEL_1'
            ? 'ابتدا سطح ۲ (مدرک و سلفی) را تکمیل کنید'
            : 'سطح ۳ قبلاً تأیید شده است',
      };
    }
  }

  // جلوگیری از ارسال مجدد وقتی رکورد همان سطح هنوز در صف بررسی است
  const existingPending = await prisma.kycVerification.findFirst({
    where: { customerId: access.customerId, level: selectedLevel, status: 'PENDING' },
    select: { id: true },
  });
  if (existingPending) {
    return { success: false, error: 'مدارک این سطح هنوز در حال بررسی است' };
  }

  const { v4: createId } = await import('uuid');

  await prisma.$transaction(async (tx) => {
    // اطمینان از PENDING بودن (برای اولین ارسال؛ اگر از قبل PENDING است بی‌اثر است)
    await tx.customer.updateMany({
      where: { id: access.customerId },
      data: { kycStatus: 'PENDING', updatedAt: new Date() },
    });
    // سطح ۲ — مدرک هویتی (بخشی از سطح ۲ و ۳)
    await tx.kycVerification.create({
      data: {
        id: createId(),
        exchangeId: customer.exchangeId,
        customerId: access.customerId,
        level: 'LEVEL_2',
        status: 'PENDING',
        docType: parsed.data.docType,
        docNumber: parsed.data.docNumber,
        fileUrl: parsed.data.fileUrl,
        updatedAt: new Date(),
      },
    });

    // سطح ۲ — سلفی تأیید چهره (بخشی از سطح ۲ و ۳)
    await tx.kycVerification.create({
      data: {
        id: createId(),
        exchangeId: customer.exchangeId,
        customerId: access.customerId,
        level: 'LEVEL_2',
        status: 'PENDING',
        docType: 'SELFIE',
        fileUrl: parsed.data.selfieUrl,
        updatedAt: new Date(),
      },
    });

    // سطح ۳ — آدرس + صورت حساب بانکی (فقط اگر سطح انتخابی = ۳)
    if (selectedLevel === 'LEVEL_3') {
      const addressText = parsed.data.address
        ? `${parsed.data.city ? `${parsed.data.city}، ` : ''}${parsed.data.address}`
        : null;
      await tx.kycVerification.create({
        data: {
          id: createId(),
          exchangeId: customer.exchangeId,
          customerId: access.customerId,
          level: 'LEVEL_3',
          status: 'PENDING',
          docType: 'ADDRESS_PROOF',
          docNumber: addressText,
          fileUrl: parsed.data.addressDocUrl ?? null,
          updatedAt: new Date(),
        },
      });
      await tx.kycVerification.create({
        data: {
          id: createId(),
          exchangeId: customer.exchangeId,
          customerId: access.customerId,
          level: 'LEVEL_3',
          status: 'PENDING',
          docType: 'BANK_STATEMENT',
          fileUrl: parsed.data.bankStatementUrl ?? null,
          updatedAt: new Date(),
        },
      });
      await tx.customer.update({
        where: { id: access.customerId },
        data: {
          city: parsed.data.city ?? undefined,
          address: parsed.data.address ?? undefined,
          updatedAt: new Date(),
        },
      });
    }
  });

  revalidateTag('customer-kyc');
  return { success: true };
}

// ─── WRITE — KYC level 1: تأیید موبایل با تلگرام ──────────────────────────────────
//
// سطح ۱ = تأیید شماره موبایل از طریق کد OTP تلگرام (مطابق معماری tiered KYC).
// کد ابتدا با requestPhoneOtpOrTelegramLink ارسال می‌شود و اینجا مصرف می‌شود.
// رکورد LEVEL_1 (docType=PHONE) ساخته می‌شود تا ادمین/صرافی تأیید کند.

export async function submitKycPhone(raw: unknown): Promise<{
  success: boolean;
  error?: string;
}> {
  const access = await requireCustomerAccess();
  if (!access.ok) return { success: false, error: access.error.message };

  const parsed = KycPhoneSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'داده نامعتبر' };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: access.customerId },
    select: { status: true, exchangeId: true, kycLevel: true },
  });
  if (!customer) return { success: false, error: 'مشتری یافت نشد' };
  if (customer.status === 'FROZEN' || customer.status === 'CLOSED') {
    return { success: false, error: 'حساب شما مسدود است — با پشتیبانی تماس بگیرید' };
  }

  // ── گیت سکوئنشی: سطح ۱ فقط وقتی باز است که هنوز تأیید نشده باشد ──
  if (customer.kycLevel !== 'NONE') {
    return { success: false, error: 'سطح ۱ قبلاً تأیید شده است' };
  }

  // FIX (2026-08-11): جلوگیری از رکوردهای تکراری — درخواستِ LEVEL_1 در صف بررسی
  // مانع ارسال مجدد می‌شود (هماهنگ با submitKycDocument که این چک را داشت).
  const existingPending = await prisma.kycVerification.findFirst({
    where: { customerId: access.customerId, level: 'LEVEL_1', status: 'PENDING' },
    select: { id: true },
  });
  if (existingPending) {
    return { success: false, error: 'درخواست سطح ۱ هنوز در حال بررسی است' };
  }

  const phone = parsed.data.phone.trim();
  if (!isPhoneValid(phone)) {
    return { success: false, error: 'شماره موبایل معتبر نیست (مثال: ۰۷۰۱۲۳۴۵۶۷)' };
  }
  const e164 = normalizeToE164(phone);

  // مصرف کد OTP — کلید همان ایمیل کاربر است (هماهنگ با phone-verify)
  const user = await prisma.user.findUnique({
    where: { id: access.userId },
    select: { email: true },
  });
  if (!user?.email) {
    return { success: false, error: 'کاربر یافت نشد' };
  }
  const otpResult = await consumeOtpToken({
    email: user.email.trim().toLowerCase(),
    code: parsed.data.code.trim(),
    intent: PHONE_VERIFY_INTENT,
  });
  if (!otpResult.ok) {
    const messages: Record<string, string> = {
      'not-found': 'کد معتبر نیست. لطفاً دوباره درخواست کنید.',
      expired: 'کد منقضی شده. لطفاً کد جدید دریافت کنید.',
      'too-many-attempts': 'تعداد تلاش بیش از حد. لطفاً کد جدید دریافت کنید.',
      'wrong-code': 'کد اشتباه است.',
    };
    return { success: false, error: messages[otpResult.reason] ?? 'کد نامعتبر است.' };
  }

  const { v4: createId } = await import('uuid');

  await prisma.$transaction(async (tx) => {
    await tx.kycVerification.create({
      data: {
        id: createId(),
        exchangeId: customer.exchangeId,
        customerId: access.customerId,
        level: 'LEVEL_1',
        status: 'PENDING',
        docType: 'PHONE',
        docNumber: e164,
        updatedAt: new Date(),
      },
    });
    await tx.customer.updateMany({
      where: { id: access.customerId, kycStatus: { not: 'PENDING' } },
      data: { kycStatus: 'PENDING', updatedAt: new Date() },
    });
    await tx.user.update({
      where: { id: access.userId },
      data: { phoneNumber: e164, pendingPhone: null },
    });
  });

  revalidateTag('customer-kyc');
  revalidateTag('customer-profile');
  return { success: true };
}

// ─── WRITE — KYC review (exchange staff / admin) ──────────────────────────────

const ReviewCustomerKycSchema = z.object({
  recordId: z.string().min(1, 'شناسه رکورد نامعتبر'),
  approved: z.boolean(),
  rejectedReason: z.string().max(500).optional(),
  /** سطح KYC — فقط هنگام approve اعمال می‌شود */
  level: z.enum(['LEVEL_1', 'LEVEL_2', 'LEVEL_3']).optional(),
  /** مدت اعتبار به ماه — فقط هنگام approve اعمال می‌شود */
  expiryMonths: z.number().int().min(1).max(120).default(24),
});

/**
 * تأیید یا رد یک رکورد Customer-level KYC.
 * دسترسی: exchange staff (همان صرافی) + پلتفرم ادمین‌ها.
 * - وضعیت KycVerification + Customer.kycStatus + (اختیاری) Customer.kycLevel در یک تراکنش sync می‌شود
 * - نوتیفیکیشن برای کاربر (اگر user متصل باشد) ارسال می‌شود
 * - auditLog ثبت می‌شود
 */
export async function reviewCustomerKycRecord(raw: unknown): Promise<{
  success: boolean;
  error?: string;
  data?: { recordId: string; newStatus: string };
}> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: auth.message };
  }

  const role = auth.user.role as string;
  const isPlatformAdmin = role === 'OWNER' || role === 'SUPERADMIN' || role === 'ADMIN';
  const isExchangeStaff = role === 'EXCHANGE' || role === 'EXCHANGE_STAFF';
  if (!isPlatformAdmin && !isExchangeStaff) {
    return { success: false, error: 'دسترسی غیرمجاز — فقط صرافی یا ادمین پلتفرم' };
  }

  const parsed = ReviewCustomerKycSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'داده نامعتبر' };
  }
  const { recordId, approved, rejectedReason, level, expiryMonths } = parsed.data;

  // 2026-08-11: enforce سطح اکشن فقط برای ادمین پلتفرم (استثناهای کاربری مالک
  // روی staff پلتفرم اعمال می‌شود). دسترسی صرافی tenant-scoped است و از این
  // گارد عبور نمی‌کند.
  if (isPlatformAdmin) {
    const perm = await requirePermission(approved ? 'kyc:approve' : 'kyc:review');
    if (!perm.success) {
      return { success: false, error: 'شما دسترسی لازم برای این عملیات را ندارید' };
    }
  }

  if (!approved && !rejectedReason) {
    return { success: false, error: 'دلیل رد باید ذکر شود' };
  }

  // پیدا کردن رکورد + customer + user
  const record = await prisma.kycVerification.findUnique({
    where: { id: recordId },
    select: {
      id: true,
      status: true,
      level: true,
      customerId: true,
      exchangeId: true,
      Customer: { select: { id: true, userId: true, exchangeId: true } },
    },
  });
  if (!record) return { success: false, error: 'رکورد KYC یافت نشد' };

  // tenant isolation: exchange staff فقط به records صرافی خودش
  // FIX (2026-08-01): exchangeId از JWT نمی‌آید (requireUser فقط {id, role} دارد) —
  // قبلاً از auth.user.exchangeId می‌خواند که برای EXCHANGE staff همیشه undefined بود
  // → صراف واقعی همیشه «دسترسی به این رکورد ندارید» می‌گرفت. حالا از
  // getExchangeForUser() (DB) resolve می‌شود — single source of truth.
  if (isExchangeStaff && !isPlatformAdmin) {
    const membership = await getExchangeForUser();
    const staffExchangeId = membership?.exchange.id;
    if (!staffExchangeId || staffExchangeId !== record.exchangeId) {
      return { success: false, error: 'دسترسی به این رکورد ندارید' };
    }
  }

  if (record.status !== 'PENDING') {
    return { success: false, error: 'این رکورد قبلاً بررسی شده است' };
  }

  const now = new Date();
  const expiresAt = approved
    ? new Date(now.getFullYear(), now.getMonth() + expiryMonths, now.getDate())
    : null;
  const newStatus: 'APPROVED' | 'REJECTED' = approved ? 'APPROVED' : 'REJECTED';

  let pendingCount = 0;
  await prisma.$transaction(async (tx) => {
    await tx.kycVerification.update({
      where: { id: recordId },
      data: {
        status: newStatus,
        reviewedAt: now,
        rejectReason: approved ? null : (rejectedReason ?? null),
        expiresAt,
        ...(approved && level ? { level } : {}),
        updatedAt: now,
      },
    });

    // ── FIX (2026-08-11): وضعیت مشتری از «مجموعهٔ کامل مدارک» استخراج می‌شود، نه از
    // بالاترین سطحِ هر رکورد APPROVED. قبل از این فیکس:
    //   ۱) تأیید فقط سلفی → سطح ۲ بدون مدرک هویتی باز می‌شد (حفرهٔ امنیتی)
    //   ۲) تأیید فقط مدرک → kycLevel جلو می‌رفت و بعد از ردِ سلفی، کاربر در ارسال
    //      مجدد قفل می‌شد («سطح ۲ قبلاً تأیید شده است»)
    const allRecords = await tx.kycVerification.findMany({
      where: { customerId: record.customerId },
      select: { level: true, docType: true, status: true },
    });
    pendingCount = allRecords.filter((r) => r.status === 'PENDING').length;
    const progression = computeKycProgression(allRecords);

    // kycLevel فقط وقتی جلو می‌رود که سطحِ هدف کامل تأیید شده باشد.
    // kycStatus: کامل → APPROVED | در صف → PENDING | ردشده → REJECTED | شروع‌نشده → APPROVED
    let nextKycStatus: 'APPROVED' | 'PENDING' | 'REJECTED' = 'APPROVED';
    if (progression.finalLevel !== 'LEVEL_3') {
      if (progression.pendingAtNext) nextKycStatus = 'PENDING';
      else if (progression.rejectedAtNext) nextKycStatus = 'REJECTED';
    }

    await tx.customer.update({
      where: { id: record.customerId },
      data: {
        kycStatus: nextKycStatus,
        kycLevel: progression.finalLevel === 'NONE' ? 'NONE' : progression.finalLevel,
        updatedAt: now,
      },
    });
  });

  revalidateTag('customer-kyc');
  revalidateTag('customer-profile');
  revalidateTag('exchange-customers');

  // audit log
  try {
    await prisma.auditLog.create({
      data: {
        id: (await import('uuid')).v4(),
        exchangeId: record.exchangeId,
        actorId: auth.user.id,
        actorRole: role,
        action: approved ? 'CUSTOMER_KYC_APPROVED' : 'CUSTOMER_KYC_REJECTED',
        entityType: 'KycVerification',
        entityId: recordId,
        meta: {
          customerId: record.customerId,
          approved,
          remainingPending: pendingCount,
          ...(rejectedReason ? { rejectedReason } : {}),
        } as Prisma.InputJsonValue,
      },
    });
  } catch {
    // best-effort
  }

  // نوتیفیکیشن برای کاربر (اگر userId داشته باشد)
  // FIX (2026-08-11): پیام‌ها برای «خود کاربر» نوشته می‌شوند (گیرنده مشتری است، نه
  // صراف) و سطحِ دقیق ذکر می‌شود — قبلاً «احراز هویت مشتری شما…» بود که به مشتری
  // ارسال می‌شد و برای تأیید جزئی هم «کامل» ادعا می‌کرد.
  const userId = record.Customer?.userId;
  if (userId) {
    const levelFa = record.level === 'LEVEL_1' ? '۱' : record.level === 'LEVEL_2' ? '۲' : '۳';
    let message: string;
    if (approved) {
      if (pendingCount > 0) {
        message = `✅ سطح ${levelFa} از احراز هویت شما تأیید شد — بقیهٔ مدارک در صف بررسی است.`;
      } else if (record.level === 'LEVEL_3') {
        message = '✅ احراز هویت شما کامل و تأیید شد. به تمام امکانات دسترسی دارید.';
      } else {
        message = `✅ سطح ${levelFa} از احراز هویت شما تأیید شد.`;
      }
    } else {
      message = `❌ احراز هویت شما رد شد. دلیل: ${rejectedReason ?? 'نامشخص'}. لطفاً مدارک را اصلاح و دوباره ارسال کنید.`;
    }
    try {
      const { createNotification } = await import('@/actions/notification-actions');
      await createNotification(userId, message);
    } catch {
      // best-effort
    }
  }

  return { success: true, data: { recordId, newStatus } };
}

/**
 * صف رکوردهای Customer-level KYC در انتظار بررسی.
 * exchange staff فقط records صرافی خودش را می‌بیند.
 */
export async function listPendingCustomerKyc(opts?: {
  exchangeId?: string;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    docType: string;
    docNumber: string | null;
    fileUrl: string | null;
    level: string;
    createdAt: Date;
    exchangeId: string;
    exchangeName: string;
  }>
> {
  const auth = await requireUser();
  if (!auth.success) return [];
  const role = auth.user.role as string;
  const isPlatformAdmin = role === 'OWNER' || role === 'SUPERADMIN' || role === 'ADMIN';
  const isExchangeStaff = role === 'EXCHANGE' || role === 'EXCHANGE_STAFF';
  if (!isPlatformAdmin && !isExchangeStaff) return [];

  // tenant scope — exchangeId از DB resolve می‌شود، نه JWT
  // FIX (2026-08-01): auth.user.exchangeId برای EXCHANGE staff همیشه undefined بود
  // → صراف بدون exchangeId → همهٔ صرافی‌ها دیده می‌شدند (security leak).
  let exchangeId: string | undefined = opts?.exchangeId;
  if (isExchangeStaff && !isPlatformAdmin) {
    const membership = await getExchangeForUser();
    exchangeId = membership?.exchange.id;
    // اگر صراف به صرافی‌ای متصل نیست، صف خالی برگردان
    if (!exchangeId) return [];
  }

  const rows = await prisma.kycVerification.findMany({
    where: {
      status: 'PENDING',
      ...(exchangeId ? { exchangeId } : {}),
    },
    take: Math.min(100, opts?.limit ?? 50),
    orderBy: { createdAt: 'asc' }, // قدیمی‌ترین اول (FIFO)
    select: {
      id: true,
      customerId: true,
      docType: true,
      docNumber: true,
      fileUrl: true,
      level: true,
      createdAt: true,
      exchangeId: true,
      Customer: { select: { fullName: true, phone: true } },
      Exchange: { select: { name: true, displayName: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    customerId: r.customerId,
    customerName: r.Customer?.fullName ?? '—',
    customerPhone: r.Customer?.phone ?? '',
    docType: r.docType,
    docNumber: r.docNumber,
    fileUrl: r.fileUrl,
    level: r.level,
    createdAt: r.createdAt,
    exchangeId: r.exchangeId,
    exchangeName: r.Exchange.displayName ?? r.Exchange.name,
  }));
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

  // P4-perf: groupBy status → یک query به‌جای ۳ count جداگانه.
  const [profile, accounts, recentTransactions, statusGroups, last30] = await Promise.all([
    getCustomerProfile(),
    getCustomerAccounts(access.customerId),
    getCustomerRecentTransactions(8),
    prisma.transaction.groupBy({
      by: ['status'],
      where: { customerId: access.customerId },
      _count: { _all: true },
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

  const statusCounts = new Map(statusGroups.map((g) => [g.status, g._count._all]));
  const totalTransactions = Array.from(statusCounts.values()).reduce((s, c) => s + c, 0);
  const completedCount = statusCounts.get('COMPLETED') ?? 0;
  const pendingCount = (statusCounts.get('PENDING') ?? 0) + (statusCounts.get('PROCESSING') ?? 0);
  const failedCount =
    (statusCounts.get('FAILED') ?? 0) +
    (statusCounts.get('CANCELLED') ?? 0) +
    (statusCounts.get('REVERSED') ?? 0);

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
      totalTransactions: totalTransactions,
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

const _getNotificationsCached = safeCache(
  async (userId: string, limit: number): Promise<CustomerNotification[]> => {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, message: true, isRead: true, createdAt: true },
    });
  },
  [],
  { key: 'customer:notifications', ttl: 30, tags: ['customer-notifications'] },
);

/**
 * getCustomerBalanceTrend — روند واقعی موجودی ۳۰ روز اخیر از تراکنش‌های مشتری.
 *
 * قبلاً AccountsContent یک sparkline مصنوعی (generateTrend با seed) می‌ساخت
 * که دادهٔ الکی بود. حالا از تراکنش‌های واقعی (AFN + غیرAFN) یک روند
 * cumulative می‌سازد: برای هر روز، مجموع تغییرات net تا آن روز.
 */
export async function getCustomerBalanceTrend(days = 30): Promise<number[]> {
  const access = await requireCustomerAccess();
  if (!access.ok) return [];

  const since = startOfDay(new Date());
  since.setDate(since.getDate() - (days - 1));

  const txns = await prisma.transaction.findMany({
    where: {
      customerId: access.customerId,
      createdAt: { gte: since },
      status: { in: ['COMPLETED', 'PROCESSING'] },
    },
    select: { kind: true, amount: true, currency: true, createdAt: true },
  });

  const CREDIT_KINDS = new Set(['DEPOSIT', 'TRANSFER', 'EXCHANGE', 'SETTLEMENT', 'ADJUSTMENT']);
  const DEBIT_KINDS = new Set(['WITHDRAWAL', 'FEE']);

  // per-day net change (همه ارزها — با فرض display balance یکسان)
  const perDay = new Map<string, number>();
  for (const t of txns) {
    const k = dayKey(t.createdAt);
    const base = perDay.get(k) ?? 0;
    if (CREDIT_KINDS.has(t.kind)) perDay.set(k, base + mapBalance(t.amount));
    else if (DEBIT_KINDS.has(t.kind)) perDay.set(k, base - mapBalance(t.amount));
  }

  // cumulative از روز اول تا امروز (۰ برای روزهای بدون تراکنش)
  const out: number[] = [];
  let acc = 0;
  const today = startOfDay(new Date());
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    acc += perDay.get(dayKey(d)) ?? 0;
    out.push(acc);
  }
  return out;
}

export async function getCustomerNotifications(limit = 30): Promise<CustomerNotification[]> {
  const auth = await requireUser();
  if (!auth.success) return [];
  return _getNotificationsCached(auth.user.id, limit);
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

// ─── WRITE — Customer Request (unified, 2026-07-28) ────────────────────────
//
// درخواست‌های structured مشتری به صرافی (باز کردن حساب، انتقال، رفع مسدودی،
// افزایش سقف، سایر). هر درخواست:
//
//  1) در جدول CustomerRequest ثبت می‌شود (source-of-truth)
//  2) یک notification تأییدیه در inbox کاربر قرار می‌گیرد (cross-link)
//  3) timeline در CustomerRequestStatusLog نگه‌داری می‌شود
//
// چرا دو محل؟
//  - CustomerRequest = لیست، فیلتر، وضعیت، timeline، اقدام (لغو)
//  - Notification = «اینباکس» تأیید سریع در کنار سایر اعلان‌ها
//
// معماری قبلی (notification + prefix hack) مشکلات زیر را داشت:
//  - کاربر نمی‌توانست لیست درخواست‌هایش را ببیند
//  - وضعیت (pending/approved/rejected) قابل track نبود
//  - صرافی نمی‌توانست query مؤثر بگیرد
//  - لغو یا ویرایش ممکن نبود
//
// این معماری: ۱ request واقعی + ۱ notification تأیید (best of both).
// ----------------------------------------------------------------------------

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
  note: z.string().trim().max(500, 'توضیح حداکثر ۵۰۰ کاراکتر است').optional().or(z.literal('')),
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

/** ۶ کاراکتر از uuid (حروف بزرگ + اعداد) — مثل REQ-A1B2C3. تلاش مجدد در صورت تکرار. */
function makeTrackingCode(): string {
  const raw = uuidv4().replace(/-/g, '').toUpperCase();
  return `REQ-${raw.slice(0, 6)}`;
}

export async function createCustomerRequest(
  raw: unknown,
): Promise<{ success: boolean; error?: string; requestId?: string; trackingCode?: string }> {
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
  const note = parsed.data.note?.trim() ?? '';

  // 1) ساخت request واقعی + initial status log + cross-link notification
  // در یک transaction تا اگر هر کدام fail شد، هیچ‌کدام commit نشود.
  const result = await prisma.$transaction(async (tx) => {
    // trackingCode یکتا (تا ۳ تلاش)
    let trackingCode = makeTrackingCode();
    for (let attempt = 0; attempt < 3; attempt++) {
      const existing = await tx.customerRequest.findUnique({
        where: { trackingCode },
        select: { id: true },
      });
      if (!existing) break;
      trackingCode = makeTrackingCode();
    }

    const created = await tx.customerRequest.create({
      data: {
        trackingCode,
        customerId: access.customerId,
        exchangeId: access.exchangeId,
        userId: access.userId,
        type: parsed.data.type,
        status: 'PENDING',
        payload: parsed.data.payload
          ? (parsed.data.payload as import('@prisma/client').Prisma.InputJsonValue)
          : undefined,
        note: note || null,
      },
      select: { id: true, trackingCode: true },
    });

    await tx.customerRequestStatusLog.create({
      data: {
        requestId: created.id,
        fromStatus: null,
        toStatus: 'PENDING',
        actorId: access.userId,
        actorRole: 'CUSTOMER',
        note: 'درخواست ایجاد شد',
      },
    });

    // 2) notification تأییدیه در inbox (best-of-both: structured + visible)
    await tx.notification.create({
      data: {
        userId: access.userId,
        message: `درخواست «${typeLabel}» با کد پیگیری ${created.trackingCode} ثبت شد. صرافی به‌زودی رسیدگی می‌کند.`,
        isRead: false,
      },
    });

    return created;
  });

  revalidateTag('customer-requests');
  revalidateTag('customer-notifications');
  return { success: true, requestId: result.id, trackingCode: result.trackingCode };
}

// ─── READ — Customer Requests (list + detail) ─────────────────────────────

export type CustomerRequestRow = {
  id: string;
  trackingCode: string;
  type: CustomerRequestType;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  note: string | null;
  payload: Record<string, string | number> | null;
  resolution: string | null;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
};

export type CustomerRequestListItem = CustomerRequestRow & {
  /** نوع درخواست به فارسی */
  typeLabel: string;
};

export type CustomerRequestStats = {
  total: number;
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
  cancelled: number;
  /** ۷ روز اخیر — تعداد ایجاد */
  last7d: number;
};

export async function getCustomerRequests(opts?: {
  status?: string;
  type?: string;
  limit?: number;
}): Promise<CustomerRequestListItem[]> {
  const access = await requireCustomerAccess();
  if (!access.ok) return [];

  const VALID_STATUS = new Set(['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED']);
  const VALID_TYPE = new Set([
    'ACCOUNT_NEW',
    'ACCOUNT_UNFREEZE',
    'TRANSFER_INITIATE',
    'LIMIT_INCREASE',
    'OTHER',
  ]);

  const where = {
    customerId: access.customerId,
    ...(opts?.status && VALID_STATUS.has(opts.status)
      ? { status: opts.status as 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED' }
      : {}),
    ...(opts?.type && VALID_TYPE.has(opts.type) ? { type: opts.type as CustomerRequestType } : {}),
  };

  const rows = await prisma.customerRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(50, opts?.limit ?? 50),
    select: {
      id: true,
      trackingCode: true,
      type: true,
      status: true,
      note: true,
      payload: true,
      resolution: true,
      createdAt: true,
      updatedAt: true,
      reviewedAt: true,
    },
  });

  return rows.map((r) => ({
    ...r,
    payload: r.payload as Record<string, string | number> | null,
    typeLabel: REQUEST_TYPE_LABEL[r.type],
  }));
}

export async function getCustomerRequestStats(): Promise<CustomerRequestStats> {
  const access = await requireCustomerAccess();
  if (!access.ok) {
    return {
      total: 0,
      pending: 0,
      inReview: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      last7d: 0,
    };
  }

  const since7 = new Date();
  since7.setDate(since7.getDate() - 7);

  // P3-perf: یک groupBy + یک count به‌جای ۷ query جداگانه.
  // groupBy روی status تعداد را جمع می‌کند؛ last7d جداگانه با شرط تاریخ.
  const [grouped, last7d] = await Promise.all([
    prisma.customerRequest.groupBy({
      by: ['status'],
      where: { customerId: access.customerId },
      _count: { _all: true },
    }),
    prisma.customerRequest.count({
      where: { customerId: access.customerId, createdAt: { gte: since7 } },
    }),
  ]);

  const counts = new Map(grouped.map((g) => [g.status, g._count._all]));
  const total = Array.from(counts.values()).reduce((s, c) => s + c, 0);

  return {
    total,
    pending: counts.get('PENDING') ?? 0,
    inReview: counts.get('IN_REVIEW') ?? 0,
    approved: counts.get('APPROVED') ?? 0,
    rejected: counts.get('REJECTED') ?? 0,
    cancelled: counts.get('CANCELLED') ?? 0,
    last7d,
  };
}

export type CustomerRequestDetail = CustomerRequestListItem & {
  resolution: string | null;
  reviewedAt: Date | null;
  reviewedById: string | null;
  exchange: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  statusLogs: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    actorRole: string | null;
    note: string | null;
    createdAt: Date;
  }>;
};

export async function getCustomerRequestById(
  requestId: string,
): Promise<CustomerRequestDetail | null> {
  const access = await requireCustomerAccess();
  if (!access.ok) return null;

  const row = await prisma.customerRequest.findFirst({
    where: { id: requestId, customerId: access.customerId },
    select: {
      id: true,
      trackingCode: true,
      type: true,
      status: true,
      note: true,
      payload: true,
      resolution: true,
      reviewedById: true,
      reviewedAt: true,
      createdAt: true,
      updatedAt: true,
      exchange: {
        select: { id: true, name: true, logoUrl: true },
      },
      statusLogs: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          actorRole: true,
          note: true,
          createdAt: true,
        },
      },
    },
  });

  if (!row) return null;

  return {
    ...row,
    payload: row.payload as Record<string, string | number> | null,
    typeLabel: REQUEST_TYPE_LABEL[row.type],
  };
}

// ─── WRITE — Customer Request cancel ─────────────────────────────────────

export async function cancelCustomerRequest(
  requestId: string,
): Promise<{ success: boolean; error?: string }> {
  const access = await requireCustomerAccess();
  if (!access.ok) return { success: false, error: access.error.message };

  const existing = await prisma.customerRequest.findFirst({
    where: { id: requestId, customerId: access.customerId },
    select: { id: true, status: true, type: true, trackingCode: true },
  });

  if (!existing) {
    return { success: false, error: 'درخواست یافت نشد' };
  }
  if (existing.status !== 'PENDING' && existing.status !== 'IN_REVIEW') {
    return {
      success: false,
      error: 'فقط درخواست‌های در انتظار یا در حال بررسی قابل لغو هستند',
    };
  }

  await prisma.$transaction([
    prisma.customerRequest.update({
      where: { id: existing.id },
      data: { status: 'CANCELLED', updatedAt: new Date() },
    }),
    prisma.customerRequestStatusLog.create({
      data: {
        requestId: existing.id,
        fromStatus: existing.status,
        toStatus: 'CANCELLED',
        actorId: access.userId,
        actorRole: 'CUSTOMER',
        note: 'درخواست توسط مشتری لغو شد',
      },
    }),
    prisma.notification.create({
      data: {
        userId: access.userId,
        message: `درخواست ${existing.trackingCode} لغو شد.`,
        isRead: false,
      },
    }),
  ]);

  revalidateTag('customer-requests');
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

// ─── Security & preferences — 2026-07-29 ────────────────────────────────── //
// این بخش با اضافه شدن فیلدهای User.notifyVoice / monthlyActivityReport و
// Customer.shareWithExchange به schema فعال شد. هر اکشن tenant-isolated و
// self-service است (کاربر فقط روی حساب خودش تغییر می‌دهد).

const PasswordChangeSchema = z
  .object({
    current: z.string().min(8, 'رمز فعلی حداقل ۸ کاراکتر'),
    next: z
      .string()
      .min(10, 'رمز جدید حداقل ۱۰ کاراکتر')
      .max(128, 'رمز جدید حداکثر ۱۲۸ کاراکتر')
      .regex(/[A-Z]/, 'رمز جدید باید شامل حرف بزرگ باشد')
      .regex(/[a-z]/, 'رمز جدید باید شامل حرف کوچک باشد')
      .regex(/[0-9]/, 'رمز جدید باید شامل عدد باشد'),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    message: 'تکرار رمز با رمز جدید یکی نیست',
    path: ['confirm'],
  })
  .refine((v) => v.current !== v.next, {
    message: 'رمز جدید نباید با رمز فعلی یکی باشد',
    path: ['next'],
  });

export type SecurityOverview = {
  twoFactorEnabled: boolean;
  deviceCount: number;
  passwordLastChangedAt: Date | null;
  /** تعداد تلاش ناموفق ورود در ۲۴ ساعت گذشته (اگر ActivityLog ثبت شده باشد) */
  failedLogins24h: number;
  email: string | null;
  phone: string;
  /** ترجیحات فعلی کاربر */
  notifyVoice: boolean;
  monthlyActivityReport: boolean;
  shareWithExchange: boolean;
};

export async function getMySecurityOverview(): Promise<FintechActionResult<SecurityOverview>> {
  const access = await requireCustomerAccess();
  if (!access.ok) {
    return { success: false, error: { code: 'FORBIDDEN', message: access.error.message } };
  }

  const [user, devices, customer] = await Promise.all([
    prisma.user.findUnique({
      where: { id: access.userId },
      select: {
        email: true,
        twoFactorEnabled: true,
        password: true,
        updatedAt: true,
        notifyVoice: true,
        monthlyActivityReport: true,
      },
    }),
    prisma.device.count({ where: { userId: access.userId, status: { not: 'REVOKED' } } }),
    prisma.customer.findUnique({
      where: { id: access.customerId },
      select: { phone: true, shareWithExchange: true },
    }),
  ]);

  if (!user || !customer) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'کاربر یافت نشد' } };
  }

  return {
    success: true,
    data: {
      twoFactorEnabled: user.twoFactorEnabled,
      deviceCount: devices,
      passwordLastChangedAt: user.password ? user.updatedAt : null,
      failedLogins24h: 0,
      email: user.email,
      phone: customer.phone,
      notifyVoice: user.notifyVoice,
      monthlyActivityReport: user.monthlyActivityReport,
      shareWithExchange: customer.shareWithExchange,
    },
  };
}

const NotifyPrefsSchema = z.object({
  notifyVoice: z.boolean().optional(),
  monthlyActivityReport: z.boolean().optional(),
  shareWithExchange: z.boolean().optional(),
});

export async function updateMyNotificationPreferences(
  input: Partial<{
    notifyVoice: boolean;
    monthlyActivityReport: boolean;
    shareWithExchange: boolean;
  }>,
): Promise<FintechActionResult<void>> {
  const access = await requireCustomerAccess();
  if (!access.ok) {
    return { success: false, error: { code: 'FORBIDDEN', message: access.error.message } };
  }

  const parsed = NotifyPrefsSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      error: { code: 'VALIDATION', message: first?.message ?? 'ورودی نامعتبر' },
    };
  }

  // فیلدهای مربوط به User
  const userData: { notifyVoice?: boolean; monthlyActivityReport?: boolean } = {};
  if (typeof parsed.data.notifyVoice === 'boolean') {
    userData.notifyVoice = parsed.data.notifyVoice;
  }
  if (typeof parsed.data.monthlyActivityReport === 'boolean') {
    userData.monthlyActivityReport = parsed.data.monthlyActivityReport;
  }

  const hasUserData = Object.keys(userData).length > 0;
  const hasCustomerData = typeof parsed.data.shareWithExchange === 'boolean';

  // P5-perf: سه query جداگانه را در یک transaction اجرا می‌کنیم.
  // اگر هیچ فیلدی تغییر نکرده → فقط AuditLog ثبت می‌شود.
  await prisma.$transaction([
    ...(hasUserData ? [prisma.user.update({ where: { id: access.userId }, data: userData })] : []),
    ...(hasCustomerData
      ? [
          prisma.customer.update({
            where: { id: access.customerId },
            data: { shareWithExchange: parsed.data.shareWithExchange },
          }),
        ]
      : []),
    prisma.auditLog.create({
      data: {
        id: uuidv4(),
        actorId: access.userId,
        actorRole: 'CUSTOMER',
        action: 'UPDATE_PREFERENCES',
        entityType: 'User',
        entityId: access.userId,
        meta: parsed.data,
      },
    }),
  ]);

  return { success: true, data: undefined };
}

export async function changeMyPassword(input: {
  current: string;
  next: string;
  confirm: string;
}): Promise<FintechActionResult<void>> {
  const access = await requireCustomerAccess();
  if (!access.ok) {
    return { success: false, error: { code: 'FORBIDDEN', message: access.error.message } };
  }

  const parsed = PasswordChangeSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      error: { code: 'VALIDATION', message: first?.message ?? 'ورودی نامعتبر' },
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: access.userId },
    select: { password: true },
  });

  if (!user?.password) {
    return {
      success: false,
      error: { code: 'NO_PASSWORD', message: 'این حساب با رمز عبور ایجاد نشده' },
    };
  }

  // بررسی رمز فعلی — bcrypt
  const bcrypt = await import('bcryptjs');
  const matches = await bcrypt.compare(parsed.data.current, user.password);
  if (!matches) {
    return { success: false, error: { code: 'WRONG_PASSWORD', message: 'رمز فعلی اشتباه است' } };
  }

  const newHash = await bcrypt.hash(parsed.data.next, 12);

  await prisma.user.update({
    where: { id: access.userId },
    data: {
      password: newHash,
      // 2026-08-13: passwordVersion (نه tokenVersion) — افزایش آن session های
      // قبلی را باطل می‌کند (jwt callback توکن را discard می‌کند). tokenVersion
      // مخصوص تغییر نقش/مجوز است که فقط claims را refresh می‌کند.
      passwordVersion: { increment: 1 },
    },
  });

  await prisma.auditLog.create({
    data: {
      id: uuidv4(),
      actorId: access.userId,
      actorRole: 'CUSTOMER',
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: access.userId,
    },
  });

  return { success: true, data: undefined };
}

export async function requestAccountDeletion(
  confirmation: string,
): Promise<FintechActionResult<{ ticketId: string }>> {
  const access = await requireCustomerAccess();
  if (!access.ok) {
    return { success: false, error: { code: 'FORBIDDEN', message: access.error.message } };
  }

  if (confirmation.trim() !== 'حذف حساب') {
    return {
      success: false,
      error: {
        code: 'CONFIRMATION_REQUIRED',
        message: 'برای تأیید، عبارت «حذف حساب» را وارد کنید',
      },
    };
  }

  // ثبت درخواست — soft delete: Customer.status = CLOSED پس از تأیید صرافی
  // اینجا فقط ticket ثبت می‌شود.
  const ticketId = `DEL-${Date.now().toString(36).toUpperCase()}`;

  await prisma.auditLog.create({
    data: {
      id: uuidv4(),
      actorId: access.userId,
      actorRole: 'CUSTOMER',
      action: 'DELETE_REQUESTED',
      entityType: 'User',
      entityId: access.userId,
      meta: { ticketId },
    },
  });

  return { success: true, data: { ticketId } };
}

// ─── WRITE — Internal transfer between own accounts ──────────────────────────

/**
 * Schema اعتبارسنجی برای انتقال بین‌حسابی.
 * هر دو حساب باید متعلق به همین customer باشند (tenant isolation).
 * فقط ارز یکسان — تبدیل ارز از این مسیر نیست (از `executeFxTrade` استفاده شود).
 */
const InternalTransferSchema = z.object({
  fromAccountId: z.string().min(1, 'حساب مبدأ نامعتبر است'),
  toAccountId: z.string().min(1, 'حساب مقصد نامعتبر است'),
  amountCents: z
    .number()
    .int()
    .positive('مبلغ باید مثبت باشد')
    .max(100_000_000_00, 'سقف انتقال ۱۰۰ میلیون'),
  note: z.string().max(200, 'یادداشت حداکثر ۲۰۰ کاراکتر').optional(),
  idempotencyKey: z.string().min(8).max(64),
  /** مرحله ۲ تأیید OTP — در اولین فراخوان ارسال نمی‌شود */
  txnRef: z.string().min(8).max(64).optional(),
  otp: z
    .string()
    .length(6)
    .regex(/^\d{6}$/)
    .optional(),
});

export type InternalTransferResult = {
  txnId: string;
  txnRef: string;
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  currency: string;
  fromBalance: string;
  toBalance: string;
  /** true وقتی انتقال بالای آستانه است و مرحلهٔ تأیید OTP لازم است */
  needsOtp?: boolean;
  expiresInSeconds?: number;
};

/**
 * انتقال بین‌حسابی داخلی — atomic.
 *
 * ایمنی:
 *   - tenant isolation: هر دو حساب باید متعلق به access.customerId باشند
 *   - currency match: هر دو حساب باید ارز یکسان داشته باشند
 *   - status check: هر دو حساب ACTIVE باشند (نه FROZEN/CLOSED)
 *   - balance check: atomic compare-and-set روی from.balance
 *   - dead-lock avoidance: account IDs مرتب می‌شوند (همیشه قفل به همان ترتیب)
 *   - idempotency: idempotencyKey برای جلوگیری از double-submit
 *   - audit log: هم debit و هم credit در LedgerEntry ثبت می‌شوند
 */
export async function transferBetweenAccounts(
  raw: unknown,
): Promise<FintechActionResult<InternalTransferResult>> {
  const access = await requireCustomerAccess();
  if (!access.ok) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: access.error.message },
    };
  }

  // Rate-limit: 30 درخواست در دقیقه per user
  const rl = await checkRateLimit(`customer-transfer:${access.userId}`, 'api');
  if (!rl.success) {
    return {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'تعداد درخواست‌های انتقال زیاد است' },
    };
  }

  const parsed = InternalTransferSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message ?? 'داده نامعتبر',
      },
    };
  }

  const { fromAccountId, toAccountId, amountCents, note, idempotencyKey } = parsed.data;
  const otpInput = parsed.data.otp;
  const otpTxnRef = parsed.data.txnRef;

  // Self-transfer
  if (fromAccountId === toAccountId) {
    return {
      success: false,
      error: { code: 'SAME_ACCOUNT', message: 'حساب مبدأ و مقصد نمی‌توانند یکسان باشند' },
    };
  }

  // Idempotency: اگر قبلاً با این کلید ثبت شده، همان نتیجه را برگردان
  const existing = await prisma.transaction.findFirst({
    where: { idempotencyKey },
    select: {
      id: true,
      accountId: true,
      destAmount: true,
      destCurrency: true,
      amount: true,
      currency: true,
      meta: true,
    },
  });
  if (existing) {
    const meta = (existing.meta as Record<string, unknown> | null) ?? {};
    return {
      success: true,
      data: {
        txnId: existing.id,
        txnRef: typeof meta.txnRef === 'string' ? meta.txnRef : existing.id,
        fromAccountId: existing.accountId ?? fromAccountId,
        toAccountId: typeof meta.toAccountId === 'string' ? meta.toAccountId : toAccountId,
        amountCents: Number(existing.amount),
        currency: existing.currency,
        fromBalance: typeof meta.fromBalance === 'string' ? meta.fromBalance : '0',
        toBalance: typeof meta.toBalance === 'string' ? meta.toBalance : '0',
      },
    };
  }

  // هر دو حساب را پیدا کن (با tenant check) — مرتب‌شده برای جلوگیری از deadlock
  const sortedIds = [fromAccountId, toAccountId].sort();
  const accounts = await prisma.fintechAccount.findMany({
    where: {
      id: { in: sortedIds },
      customerId: access.customerId,
    },
    select: {
      id: true,
      currency: true,
      balance: true,
      status: true,
      exchangeId: true,
    },
  });

  if (accounts.length !== 2) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'یکی از حساب‌ها یافت نشد' },
    };
  }

  const from = accounts.find((a) => a.id === fromAccountId);
  const to = accounts.find((a) => a.id === toAccountId);
  if (!from || !to) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'حساب نامعتبر' },
    };
  }

  // Currency match
  if (from.currency !== to.currency) {
    return {
      success: false,
      error: {
        code: 'CURRENCY_MISMATCH',
        message: 'برای تبدیل ارز از بخش «تبدیل ارز» استفاده کنید',
      },
    };
  }

  // Status check
  if (from.status !== 'ACTIVE' || to.status !== 'ACTIVE') {
    return {
      success: false,
      error: {
        code: 'ACCOUNT_INACTIVE',
        message: 'یکی از حساب‌ها فعال نیست',
      },
    };
  }

  // Customer must be ACTIVE
  const customer = await prisma.customer.findUnique({
    where: { id: access.customerId },
    select: { status: true, exchangeId: true },
  });
  if (!customer || customer.status === 'FROZEN' || customer.status === 'CLOSED') {
    return {
      success: false,
      error: { code: 'CUSTOMER_LOCKED', message: 'حساب مشتری مسدود است' },
    };
  }

  // سقف AML سطح‌بندی‌شده KYC (per-txn + روزانه)
  const limitCheck = await assertOutgoingKycLimit({
    exchangeId: customer.exchangeId,
    customerId: access.customerId,
    currency: from.currency,
    amountCents,
  });
  if (!limitCheck.ok) {
    return {
      success: false,
      error: { code: limitCheck.code, message: limitCheck.error },
    };
  }

  // exchange consistency
  if (from.exchangeId !== customer.exchangeId || to.exchangeId !== customer.exchangeId) {
    return {
      success: false,
      error: { code: 'EXCHANGE_MISMATCH', message: 'حساب‌ها باید از یک صرافی باشند' },
    };
  }

  // ─── OTP guard برای انتقال‌های بالای آستانه (هماهنگ با P2P و برداشت) ───────
  // kind='TRANSFER' طبق isHighValueTransaction بالای ۱۰۰,۰۰۰ AFN نیاز به OTP دارد.
  // جریان دو مرحله‌ای:
  //   مرحله ۱ (بدون otp): درخواست OTP → needsOtp=true + txnRef (هیچ انتقالی اجرا نمی‌شود)
  //   مرحله ۲ (با otp + txnRef): تأیید OTP → اجرای انتقال
  const amountBigInt = BigInt(amountCents);
  const needsOtp = isHighValueTransaction({ kind: 'TRANSFER', amountCents: amountBigInt });
  if (needsOtp) {
    if (!otpInput || !otpTxnRef) {
      // مرحله ۱ — درخواست کد تأیید بدون اجرای تراکنش
      const txnRef = `ITR-${Date.now().toString(36).toUpperCase()}-${randomBytes(3)
        .toString('hex')
        .toUpperCase()}`;
      const otpResult = await requestTransactionOtp({
        txnRef,
        amountCents: amountBigInt,
        kind: 'TRANSFER',
      });
      if (!otpResult.success) return otpResult;
      return {
        success: true,
        data: {
          txnId: '',
          txnRef,
          fromAccountId,
          toAccountId,
          amountCents,
          currency: from.currency,
          fromBalance: '0',
          toBalance: '0',
          needsOtp: true,
          expiresInSeconds: otpResult.data.expiresInSeconds,
        },
      };
    }
    // مرحله ۲ — تأیید کد
    const otpResult = await verifyTransactionOtp({ txnRef: otpTxnRef, otp: otpInput });
    if (!otpResult.success) return otpResult;
  }

  // C2-style: crypto.randomBytes به جای Math.random() — غیرقابل پیش‌بینی (anti-collision)
  const txnRef = `TRF-${Date.now().toString(36).toUpperCase()}-${randomBytes(3)
    .toString('hex')
    .toUpperCase()}`;

  // ─── Atomic transaction ──────────────────────────────────────────────────
  let result: InternalTransferResult | null = null;
  try {
    result = await prisma.$transaction(
      async (tx) => {
        // 1) Debit (atomic compare-and-set) — فقط اگر موجودی کافی است
        const debit = await tx.fintechAccount.updateMany({
          where: {
            id: fromAccountId,
            status: 'ACTIVE',
            balance: { gte: BigInt(amountCents) },
          },
          data: {
            balance: { decrement: BigInt(amountCents) },
            updatedAt: new Date(),
          },
        });

        if (debit.count === 0) {
          // موجودی کافی نیست یا وضعیت تغییر کرده
          throw new Error('INSUFFICIENT_BALANCE');
        }

        // 2) Credit
        const credit = await tx.fintechAccount.updateMany({
          where: {
            id: toAccountId,
            status: 'ACTIVE',
          },
          data: {
            balance: { increment: BigInt(amountCents) },
            updatedAt: new Date(),
          },
        });

        if (credit.count === 0) {
          throw new Error('CREDIT_FAILED');
        }

        // 3) وضعیت نهایی برای محاسبهٔ runningBalance
        const fromAfter = await tx.fintechAccount.findUnique({
          where: { id: fromAccountId },
          select: { balance: true, currency: true },
        });
        const toAfter = await tx.fintechAccount.findUnique({
          where: { id: toAccountId },
          select: { balance: true, currency: true },
        });
        if (!fromAfter || !toAfter) throw new Error('STATE_LOST');

        const txnId = uuidv4();
        const now = new Date();

        // 4) Transaction record
        await tx.transaction.create({
          data: {
            id: txnId,
            exchangeId: customer.exchangeId,
            customerId: access.customerId,
            accountId: fromAccountId,
            kind: 'TRANSFER',
            status: 'COMPLETED',
            amount: BigInt(amountCents),
            currency: from.currency,
            destAmount: BigInt(amountCents),
            destCurrency: to.currency,
            idempotencyKey,
            counterparty: 'انتقال داخلی',
            note: note?.trim() || null,
            meta: {
              txnRef,
              fromAccountId,
              toAccountId,
              internal: true,
            },
            createdById: access.userId,
            createdAt: now,
            updatedAt: now,
          },
        });

        // 5) LedgerEntry: debit
        await tx.ledgerEntry.create({
          data: {
            id: uuidv4(),
            exchangeId: customer.exchangeId,
            accountId: fromAccountId,
            customerId: access.customerId,
            txnId,
            direction: 'DEBIT',
            amount: BigInt(amountCents),
            currency: from.currency,
            runningBalance: fromAfter.balance,
            description: note?.trim() || `انتقال به حساب ${to.currency}`,
            createdById: access.userId,
            createdAt: now,
          },
        });

        // 6) LedgerEntry: credit
        await tx.ledgerEntry.create({
          data: {
            id: uuidv4(),
            exchangeId: customer.exchangeId,
            accountId: toAccountId,
            customerId: access.customerId,
            txnId,
            direction: 'CREDIT',
            amount: BigInt(amountCents),
            currency: to.currency,
            runningBalance: toAfter.balance,
            description: note?.trim() || `انتقال از حساب ${from.currency}`,
            createdById: access.userId,
            createdAt: now,
          },
        });

        // 7) AuditLog
        await tx.auditLog.create({
          data: {
            id: uuidv4(),
            actorId: access.userId,
            actorRole: 'CUSTOMER',
            action: 'INTERNAL_TRANSFER',
            entityType: 'Transaction',
            entityId: txnId,
            meta: {
              fromAccountId,
              toAccountId,
              amountCents,
              currency: from.currency,
              txnRef,
            },
          },
        });

        return {
          txnId,
          txnRef,
          fromAccountId,
          toAccountId,
          amountCents,
          currency: from.currency,
          fromBalance: fromAfter.balance.toString(),
          toBalance: toAfter.balance.toString(),
        };
      },
      {
        // بالاترین isolation برای اطمینان از atomicity واقعی
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'TRANSFER_FAILED';
    // R4-fix: دو درخواست هم‌زمان با یک idempotencyKey → دومی P2002 می‌گیرد
    // (unique). چون کل تراکنش rollback شده (debit برگشته)، دوبار برداشت نمی‌شود؛
    // فقط باید نتیجهٔ اولی را برگردانیم (idempotent).
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === 'P2002'
    ) {
      const dup = await prisma.transaction.findUnique({ where: { idempotencyKey } });
      if (dup) {
        const meta = (dup.meta as Record<string, unknown> | null) ?? {};
        return {
          success: true,
          data: {
            txnId: dup.id,
            txnRef: typeof meta.txnRef === 'string' ? meta.txnRef : dup.id,
            fromAccountId: dup.accountId ?? fromAccountId,
            toAccountId: typeof meta.toAccountId === 'string' ? meta.toAccountId : toAccountId,
            amountCents: Number(dup.amount),
            currency: dup.currency,
            fromBalance: typeof meta.fromBalance === 'string' ? meta.fromBalance : '0',
            toBalance: typeof meta.toBalance === 'string' ? meta.toBalance : '0',
          },
        };
      }
    }
    if (msg === 'INSUFFICIENT_BALANCE') {
      return {
        success: false,
        error: { code: 'INSUFFICIENT_BALANCE', message: 'موجودی کافی نیست' },
      };
    }
    if (msg === 'CREDIT_FAILED' || msg === 'STATE_LOST') {
      return {
        success: false,
        error: { code: 'STATE_ERROR', message: 'خطا در به‌روزرسانی حساب مقصد' },
      };
    }
    return {
      success: false,
      error: { code: 'TRANSFER_FAILED', message: 'انتقال با خطا مواجه شد' },
    };
  }

  if (!result) {
    return {
      success: false,
      error: { code: 'TRANSFER_FAILED', message: 'انتقال ناموفق بود' },
    };
  }

  // Revalidate caches
  revalidateTag('customer-accounts');
  revalidateTag('customer-transactions');
  revalidateTag('customer-dashboard');
  revalidateTag(`account-${fromAccountId}`);
  revalidateTag(`account-${toAccountId}`);

  return { success: true, data: result };
}
