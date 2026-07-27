'use server';

/**
 * credit-rates.ts — Server Actions برای نرخ‌های اعتباری بانک‌ها.
 *
 * صفحات عمومی (read-only):
 *   - getAllCreditRates: فهرست همه نرخ‌ها (با فیلتر روی type/status)
 *   - getBankBySlug: اطلاعات یک بانک + نرخ‌هایش
 *   - getCreditRateAggregates: آمار سریع (میانگین، کم/زیاد)
 *
 * ادمین (mutating):
 *   - createBank, updateBank, deleteBank
 *   - createCreditRate, updateCreditRate, archiveCreditRate
 */

import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireAdmin, requireUser } from '@/lib/require-auth';
import { revalidatePath, revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import { CreditRateType } from '@prisma/client';
import { headers } from 'next/headers';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BankRow = {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  country: string;
  city: string | null;
  logoUrl: string | null;
  website: string | null;
  licenseNo: string | null;
  status: string;
  isVisible: boolean;
  sortOrder: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { rates: number };
};

export type CreditRateRow = {
  id: string;
  bankId: string;
  type: CreditRateType;
  title: string;
  description: string | null;
  annualRate: number;
  minAmountCents: number;
  maxAmountCents: number;
  maxTermMonths: number;
  depositRatio: number | null;
  currency: string;
  status: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  source: string | null;
  sortOrder: number;
  internalNote: string | null;
  createdAt: string;
  updatedAt: string;
  bank?: Pick<BankRow, 'id' | 'slug' | 'name' | 'displayName' | 'logoUrl'>;
};

export type CreditRateAggregate = {
  byType: Array<{
    type: CreditRateType;
    count: number;
    avgRate: number;
    minRate: number;
    maxRate: number;
  }>;
  bankCount: number;
  rateCount: number;
  bestDeposit: CreditRateRow | null;
  cheapestLoan: CreditRateRow | null;
};

export const TYPE_FA: Record<CreditRateType, string> = {
  MORTGAGE: 'وام مسکن',
  PERSONAL: 'وام شخصی',
  AUTO: 'وام خودرو',
  BUSINESS: 'وام کسب‌وکار',
  QARD_AL_HASAN: 'قرض‌الحسنه',
  EDUCATION: 'وام تحصیلی',
  AGRICULTURE: 'وام کشاورزی',
  COMMERCIAL: 'وام تجاری',
  DEPOSIT: 'سپرده سرمایه‌گذاری',
  OTHER: 'سایر',
};

export const TYPE_DESC: Record<CreditRateType, string> = {
  MORTGAGE: 'وام بلندمدت برای خرید یا ساخت مسکن',
  PERSONAL: 'وام برای نیازهای شخصی بدون وثیقه',
  AUTO: 'وام برای خرید خودرو',
  BUSINESS: 'وام برای تأمین سرمایه در گردش کسب‌وکارها',
  QARD_AL_HASAN: 'وام قرض‌الحسنه بدون بهره',
  EDUCATION: 'وام کم‌بهره برای شهریه و هزینه تحصیل',
  AGRICULTURE: 'وام برای کشاورزان و دامداران',
  COMMERCIAL: 'وام تجاری برای بازرگانان',
  DEPOSIT: 'سپرده‌گذاری بلندمدت با سود تضمینی',
  OTHER: 'سایر محصولات اعتباری',
};

function mapBank(raw: {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  country: string;
  city: string | null;
  logoUrl: string | null;
  website: string | null;
  licenseNo: string | null;
  status: string;
  isVisible: boolean;
  sortOrder: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { rates: number };
}): BankRow {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    displayName: raw.displayName,
    country: raw.country,
    city: raw.city,
    logoUrl: raw.logoUrl,
    website: raw.website,
    licenseNo: raw.licenseNo,
    status: raw.status,
    isVisible: raw.isVisible,
    sortOrder: raw.sortOrder,
    description: raw.description,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    _count: raw._count,
  };
}

function mapRate(
  raw: {
    id: string;
    bankId: string;
    type: CreditRateType;
    title: string;
    description: string | null;
    annualRate: { toNumber: () => number } | number;
    minAmountCents: bigint;
    maxAmountCents: bigint;
    maxTermMonths: number;
    depositRatio: { toNumber: () => number } | number | null;
    currency: string;
    status: string;
    effectiveFrom: Date | null;
    effectiveTo: Date | null;
    source: string | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    bank?: {
      id: string;
      slug: string;
      name: string;
      displayName: string | null;
      logoUrl: string | null;
    };
  },
): CreditRateRow {
  return {
    id: raw.id,
    bankId: raw.bankId,
    type: raw.type,
    title: raw.title,
    description: raw.description,
    annualRate:
      typeof raw.annualRate === 'number'
        ? raw.annualRate
        : (raw.annualRate as { toNumber: () => number }).toNumber(),
    minAmountCents: Number(raw.minAmountCents),
    maxAmountCents: Number(raw.maxAmountCents),
    maxTermMonths: raw.maxTermMonths,
    depositRatio:
      raw.depositRatio == null
        ? null
        : typeof raw.depositRatio === 'number'
          ? raw.depositRatio
          : (raw.depositRatio as { toNumber: () => number }).toNumber(),
    currency: raw.currency,
    status: raw.status,
    effectiveFrom: raw.effectiveFrom?.toISOString() ?? null,
    effectiveTo: raw.effectiveTo?.toISOString() ?? null,
    source: raw.source,
    sortOrder: raw.sortOrder,
    internalNote: (raw as any).internalNote ?? null,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    bank: raw.bank
      ? {
          id: raw.bank.id,
          slug: raw.bank.slug,
          name: raw.bank.name,
          displayName: raw.bank.displayName,
          logoUrl: raw.bank.logoUrl,
        }
      : undefined,
  };
}

// ─── READ — Public ───────────────────────────────────────────────────────────

export async function getAllCreditRates(opts?: {
  type?: CreditRateType;
  bankId?: string;
  onlyActive?: boolean;
}): Promise<FintechActionResult<{ banks: BankRow[]; rates: CreditRateRow[] }>> {
  try {
    const banks = await prisma.bank.findMany({
      where: {
        status: 'ACTIVE',
        isVisible: true,
        ...(opts?.bankId ? { id: opts.bankId } : {}),
      },
      include: { _count: { select: { rates: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const rates = await prisma.creditRate.findMany({
      where: {
        bank: { status: 'ACTIVE', isVisible: true },
        ...(opts?.type ? { type: opts.type } : {}),
        ...(opts?.onlyActive ? { status: 'ACTIVE' } : {}),
      },
      include: {
        bank: { select: { id: true, slug: true, name: true, displayName: true, logoUrl: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { annualRate: 'asc' }],
    });

    return {
      success: true,
      data: {
        banks: banks.map(mapBank),
        rates: rates.map((r) => mapRate(r)),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: { code: 'DB_ERROR', message: 'خطا در بارگذاری نرخ‌ها' },
    };
  }
}

export async function getBankBySlug(slug: string): Promise<
  FintechActionResult<{ bank: BankRow; rates: CreditRateRow[] }>
> {
  if (!slug || typeof slug !== 'string') {
    return { success: false, error: { code: 'INVALID_SLUG', message: 'نام بانک نامعتبر' } };
  }
  try {
    const bank = await prisma.bank.findFirst({
      where: { slug, status: 'ACTIVE', isVisible: true },
      include: { _count: { select: { rates: true } } },
    });
    if (!bank) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'بانک یافت نشد' } };
    }
    const rates = await prisma.creditRate.findMany({
      where: { bankId: bank.id, status: 'ACTIVE' },
      include: {
        bank: { select: { id: true, slug: true, name: true, displayName: true, logoUrl: true } },
      },
      orderBy: [{ type: 'asc' }, { annualRate: 'asc' }],
    });
    return {
      success: true,
      data: { bank: mapBank(bank), rates: rates.map((r) => mapRate(r)) },
    };
  } catch {
    return {
      success: false,
      error: { code: 'DB_ERROR', message: 'خطا در بارگذاری اطلاعات بانک' },
    };
  }
}

export async function getCreditRateAggregates(): Promise<FintechActionResult<CreditRateAggregate>> {
  try {
    const allRates = await prisma.creditRate.findMany({
      where: { status: 'ACTIVE', bank: { status: 'ACTIVE', isVisible: true } },
      select: { type: true, annualRate: true, title: true, bankId: true, currency: true },
    });

    const byTypeMap = new Map<
      CreditRateType,
      { count: number; sum: number; min: number; max: number }
    >();
    let bankIds = new Set<string>();
    for (const r of allRates) {
      bankIds.add(r.bankId);
      const num = typeof r.annualRate === 'number' ? r.annualRate : (r.annualRate as { toNumber: () => number }).toNumber();
      const e = byTypeMap.get(r.type) ?? { count: 0, sum: 0, min: Infinity, max: -Infinity };
      e.count += 1;
      e.sum += num;
      e.min = Math.min(e.min, num);
      e.max = Math.max(e.max, num);
      byTypeMap.set(r.type, e);
    }
    const byType = Array.from(byTypeMap.entries()).map(([type, v]) => ({
      type,
      count: v.count,
      avgRate: v.sum / v.count,
      minRate: v.min,
      maxRate: v.max,
    }));

    const deposits = allRates.filter((r) => r.type === 'DEPOSIT');
    const loans = allRates.filter((r) => r.type !== 'DEPOSIT');
    const bestDeposit =
      deposits.length > 0
        ? deposits.reduce((best, r) => {
            const num = typeof r.annualRate === 'number' ? r.annualRate : (r.annualRate as { toNumber: () => number }).toNumber();
            const bestNum = typeof best.annualRate === 'number' ? best.annualRate : (best.annualRate as { toNumber: () => number }).toNumber();
            return num > bestNum ? r : best;
          })
        : null;
    const cheapestLoan =
      loans.length > 0
        ? loans.reduce((best, r) => {
            const num = typeof r.annualRate === 'number' ? r.annualRate : (r.annualRate as { toNumber: () => number }).toNumber();
            const bestNum = typeof best.annualRate === 'number' ? best.annualRate : (best.annualRate as { toNumber: () => number }).toNumber();
            return num < bestNum ? r : best;
          })
        : null;

    return {
      success: true,
      data: {
        byType,
        bankCount: bankIds.size,
        rateCount: allRates.length,
        bestDeposit: bestDeposit ? (bestDeposit as unknown as CreditRateRow) : null,
        cheapestLoan: cheapestLoan ? (cheapestLoan as unknown as CreditRateRow) : null,
      },
    };
  } catch {
    return {
      success: false,
      error: { code: 'DB_ERROR', message: 'خطا در محاسبه آمار' },
    };
  }
}

// ─── WRITE — Admin ───────────────────────────────────────────────────────────

const BankCreateSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'فقط حروف کوچک، اعداد و خط تیره'),
  name: z.string().min(2).max(120),
  displayName: z.string().max(120).nullable().optional(),
  country: z.string().length(2).default('AF'),
  city: z.string().max(80).nullable().optional(),
  logoUrl: z.string().url().nullable().optional().or(z.literal('')),
  website: z.string().url().nullable().optional().or(z.literal('')),
  licenseNo: z.string().max(60).nullable().optional(),
  status: z.enum(['ACTIVE', 'PENDING', 'SUSPENDED', 'CLOSED']).default('ACTIVE'),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  description: z.string().max(500).nullable().optional(),
});

export async function createBank(raw: unknown): Promise<FintechActionResult<BankRow>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'دسترسی ندارید' } };
  }
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await checkRateLimit(`admin-bank:${auth.user.id}`, 'api');
  if (!rl.success) {
    return { success: false, error: { code: 'RATE_LIMITED', message: 'تعداد درخواست‌ها زیاد است' } };
  }
  const parsed = BankCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message ?? 'خطای اعتبارسنجی',
      },
    };
  }
  const d = parsed.data;
  const existing = await prisma.bank.findUnique({ where: { slug: d.slug } });
  if (existing) {
    return { success: false, error: { code: 'DUPLICATE_SLUG', message: 'این slug قبلاً استفاده شده' } };
  }
  const now = new Date();
  const bank = await prisma.bank.create({
    data: {
      id: createId(),
      slug: d.slug,
      name: d.name,
      displayName: d.displayName ?? null,
      country: d.country,
      city: d.city ?? null,
      logoUrl: d.logoUrl || null,
      website: d.website || null,
      licenseNo: d.licenseNo ?? null,
      status: d.status,
      isVisible: d.isVisible,
      sortOrder: d.sortOrder,
      description: d.description ?? null,
      createdAt: now,
      updatedAt: now,
    },
  });
  await prisma.auditLog.create({
    data: {
      id: createId(),
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: 'BANK_CREATED',
      entityType: 'Bank',
      entityId: bank.id,
      ip,
      meta: { slug: d.slug, name: d.name } as object,
    },
  });
  revalidateTag('credit-rates');
  revalidatePath('/credit-rates');
  revalidatePath('/dashboard/credit-rates');
  return { success: true, data: mapBank({ ...bank, _count: { rates: 0 } }) };
}

const BankUpdateSchema = BankCreateSchema.partial().extend({
  id: z.string().min(1),
});

export async function updateBank(
  raw: unknown,
): Promise<FintechActionResult<BankRow>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'دسترسی ندارید' } };
  }
  const parsed = BankUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'خطا' },
    };
  }
  const d = parsed.data;
  const bank = await prisma.bank.update({
    where: { id: d.id },
    data: {
      ...(d.slug !== undefined ? { slug: d.slug } : {}),
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.displayName !== undefined ? { displayName: d.displayName } : {}),
      ...(d.country !== undefined ? { country: d.country } : {}),
      ...(d.city !== undefined ? { city: d.city } : {}),
      ...(d.logoUrl !== undefined ? { logoUrl: d.logoUrl || null } : {}),
      ...(d.website !== undefined ? { website: d.website || null } : {}),
      ...(d.licenseNo !== undefined ? { licenseNo: d.licenseNo } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      ...(d.isVisible !== undefined ? { isVisible: d.isVisible } : {}),
      ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
      ...(d.description !== undefined ? { description: d.description } : {}),
      updatedAt: new Date(),
    },
    include: { _count: { select: { rates: true } } },
  });
  revalidateTag('credit-rates');
  revalidatePath(`/credit-rates/${bank.slug}`);
  revalidatePath('/dashboard/credit-rates');
  return { success: true, data: mapBank(bank) };
}

export async function deleteBank(id: string): Promise<FintechActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'دسترسی ندارید' } };
  }
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const bank = await prisma.bank.findUnique({ where: { id } });
  if (!bank) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'بانک یافت نشد' } };
  }
  await prisma.bank.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      id: createId(),
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: 'BANK_DELETED',
      entityType: 'Bank',
      entityId: id,
      ip,
      meta: { slug: bank.slug, name: bank.name } as object,
    },
  });
  revalidateTag('credit-rates');
  revalidatePath('/credit-rates');
  revalidatePath('/dashboard/credit-rates');
  return { success: true, data: { id } };
}

const RateCreateSchema = z.object({
  bankId: z.string().min(1),
  type: z.nativeEnum(CreditRateType),
  title: z.string().min(2).max(120),
  description: z.string().max(500).nullable().optional(),
  annualRate: z.number().min(0).max(100),
  minAmountCents: z.number().int().min(0).default(0),
  maxAmountCents: z.number().int().min(0).default(0),
  maxTermMonths: z.number().int().min(0).max(600).default(0),
  depositRatio: z.number().min(0).max(100).nullable().optional(),
  currency: z.enum(['AFN', 'IRR', 'USD']).default('AFN'),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).default('ACTIVE'),
  effectiveFrom: z.string().nullable().optional(),
  effectiveTo: z.string().nullable().optional(),
  source: z.string().max(120).nullable().optional(),
  sortOrder: z.number().int().default(0),
  internalNote: z.string().max(500).nullable().optional(),
});

export async function createCreditRate(raw: unknown): Promise<FintechActionResult<CreditRateRow>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'دسترسی ندارید' } };
  }
  const parsed = RateCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'خطا' },
    };
  }
  const d = parsed.data;
  const bank = await prisma.bank.findUnique({ where: { id: d.bankId } });
  if (!bank) {
    return { success: false, error: { code: 'BANK_NOT_FOUND', message: 'بانک یافت نشد' } };
  }
  const now = new Date();
  const rate = await prisma.creditRate.create({
    data: {
      id: createId(),
      bankId: d.bankId,
      type: d.type,
      title: d.title,
      description: d.description ?? null,
      annualRate: d.annualRate,
      minAmountCents: BigInt(d.minAmountCents),
      maxAmountCents: BigInt(d.maxAmountCents),
      maxTermMonths: d.maxTermMonths,
      depositRatio: d.depositRatio ?? null,
      currency: d.currency,
      status: d.status,
      effectiveFrom: d.effectiveFrom ? new Date(d.effectiveFrom) : null,
      effectiveTo: d.effectiveTo ? new Date(d.effectiveTo) : null,
      source: d.source ?? null,
      sortOrder: d.sortOrder,
      internalNote: d.internalNote ?? null,
      createdAt: now,
      updatedAt: now,
    },
    include: {
      bank: { select: { id: true, slug: true, name: true, displayName: true, logoUrl: true } },
    },
  });
  revalidateTag('credit-rates');
  revalidatePath('/credit-rates');
  revalidatePath(`/credit-rates/${bank.slug}`);
  revalidatePath('/dashboard/credit-rates');
  return { success: true, data: mapRate(rate) };
}

const RateUpdateSchema = RateCreateSchema.partial().extend({ id: z.string() });

export async function updateCreditRate(
  raw: unknown,
): Promise<FintechActionResult<CreditRateRow>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'دسترسی ندارید' } };
  }
  const parsed = RateUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'خطا' },
    };
  }
  const d = parsed.data;
  const rate = await prisma.creditRate.update({
    where: { id: d.id },
    data: {
      ...(d.type !== undefined ? { type: d.type } : {}),
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.description !== undefined ? { description: d.description ?? null } : {}),
      ...(d.annualRate !== undefined ? { annualRate: d.annualRate } : {}),
      ...(d.minAmountCents !== undefined ? { minAmountCents: BigInt(d.minAmountCents) } : {}),
      ...(d.maxAmountCents !== undefined ? { maxAmountCents: BigInt(d.maxAmountCents) } : {}),
      ...(d.maxTermMonths !== undefined ? { maxTermMonths: d.maxTermMonths } : {}),
      ...(d.depositRatio !== undefined ? { depositRatio: d.depositRatio ?? null } : {}),
      ...(d.currency !== undefined ? { currency: d.currency } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      ...(d.effectiveFrom !== undefined
        ? { effectiveFrom: d.effectiveFrom ? new Date(d.effectiveFrom) : null }
        : {}),
      ...(d.effectiveTo !== undefined
        ? { effectiveTo: d.effectiveTo ? new Date(d.effectiveTo) : null }
        : {}),
      ...(d.source !== undefined ? { source: d.source ?? null } : {}),
      ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
      ...(d.internalNote !== undefined ? { internalNote: d.internalNote ?? null } : {}),
      updatedAt: new Date(),
    },
    include: {
      bank: { select: { id: true, slug: true, name: true, displayName: true, logoUrl: true } },
    },
  });
  revalidateTag('credit-rates');
  revalidatePath('/credit-rates');
  revalidatePath(`/credit-rates/${rate.bank?.slug ?? ''}`);
  revalidatePath('/dashboard/credit-rates');
  return { success: true, data: mapRate(rate) };
}

export async function archiveCreditRate(
  id: string,
): Promise<FintechActionResult<CreditRateRow>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'دسترسی ندارید' } };
  }
  const rate = await prisma.creditRate.update({
    where: { id },
    data: { status: 'ARCHIVED', updatedAt: new Date() },
    include: {
      bank: { select: { id: true, slug: true, name: true, displayName: true, logoUrl: true } },
    },
  });
  revalidateTag('credit-rates');
  revalidatePath('/credit-rates');
  revalidatePath(`/credit-rates/${rate.bank?.slug ?? ''}`);
  revalidatePath('/dashboard/credit-rates');
  return { success: true, data: mapRate(rate) };
}
