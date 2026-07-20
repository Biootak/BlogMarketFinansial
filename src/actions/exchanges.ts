'use server';

/**
 * exchanges — Server Actions برای مدیریت صراف‌ها (Exchange).
 *
 * دو سطح دسترسی:
 *   OWNER/ADMIN پلتفرم: همه صراف‌ها را می‌بینند و مدیریت می‌کنند.
 *   ExchangeStaff: فقط صرافی خودش را می‌بیند.
 *
 * Tenant isolation: هر query exchangeId را enforce می‌کند.
 */

import prisma from '@/lib/db';
import { requireAdmin, requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { unstable_cache } from 'next/cache';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// ─── Schemas ────────────────────────────────────────────────────────────────

const ExchangeCreateSchema = z.object({
  name: z.string().min(2, 'نام صرافی حداقل ۲ کاراکتر').max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'فقط حروف انگلیسی کوچک، اعداد و خط تیره'),
  licenseNo: z.string().max(60).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email('ایمیل نامعتبر').nullable().optional(),
  logoUrl: z.string().url('آدرس لوگو نامعتبر').nullable().optional(),
  dailyLimitAf: z.number().int().min(0).default(0),
  platformFee: z.number().min(0).max(100).default(0),
  requireKyc: z.boolean().default(true),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED']).default('PENDING'),
});

const ExchangeUpdateSchema = ExchangeCreateSchema.partial().omit({ slug: true });

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExchangeRow = {
  id: string;
  name: string;
  slug: string;
  licenseNo: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  status: string;
  /** number به جای bigint — JSON-serializable */
  dailyLimitAf: number;
  platformFee: number;
  requireKyc: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { Customer: number; Transaction: number };
};

// ─── BigInt mapper ────────────────────────────────────────────────────────────

/** تبدیل رکورد خام Prisma به ExchangeRow — bigint → number */
function mapExchange(raw: {
  id: string;
  name: string;
  slug: string;
  licenseNo: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  status: string;
  dailyLimitAf: bigint;
  platformFee: number;
  requireKyc: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { Customer: number; Transaction: number };
}): ExchangeRow {
  return { ...raw, dailyLimitAf: Number(raw.dailyLimitAf) };
}

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// ─── READ — Platform Admin ────────────────────────────────────────────────────

export const getAllExchanges = unstable_cache(
  async (): Promise<ExchangeRow[]> => {
    const rows = await prisma.exchange.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { Customer: true, Transaction: true } } },
    });
    return rows.map(mapExchange);
  },
  ['exchanges:all:v1'],
  { revalidate: 60, tags: ['exchanges'] },
);

// ─── READ — Single Exchange (برای پنل صراف) ──────────────────────────────────

export async function getExchangeById(id: string): Promise<ExchangeRow | null> {
  const row = await prisma.exchange.findUnique({
    where: { id },
    include: { _count: { select: { Customer: true, Transaction: true } } },
  });
  return row ? mapExchange(row) : null;
}

/** پیدا کردن صرافی که این user عضو staff آن است */
export async function getExchangeForUser(userId: string): Promise<{
  exchange: ExchangeRow;
  staffRole: string;
  permissions: string[];
} | null> {
  const staff = await prisma.exchangeStaff.findFirst({
    where: { userId, revokedAt: null },
    include: {
      Exchange: {
        include: { _count: { select: { Customer: true, Transaction: true } } },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });
  if (!staff) return null;
  return {
    exchange: mapExchange(staff.Exchange),
    staffRole: staff.role,
    permissions: staff.permissions,
  };
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createExchange(raw: unknown): Promise<ActionResult<ExchangeRow>> {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  const parsed = ExchangeCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'داده نامعتبر' },
    };
  }

  const existing = await prisma.exchange.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return {
      success: false,
      error: { code: 'DUPLICATE_SLUG', message: `slug «${parsed.data.slug}» قبلاً ثبت شده` },
    };
  }

  const row = await prisma.exchange.create({
    data: {
      id: createId(),
      ...parsed.data,
      dailyLimitAf: BigInt(parsed.data.dailyLimitAf ?? 0),
      updatedAt: new Date(),
      createdById: auth.user.id,
    },
  });

  revalidateTag('exchanges');
  return { success: true, data: mapExchange(row) };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateExchange(id: string, raw: unknown): Promise<ActionResult<ExchangeRow>> {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  const parsed = ExchangeUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'داده نامعتبر' },
    };
  }

  const row = await prisma.exchange.update({
    where: { id },
    data: {
      ...parsed.data,
      ...(parsed.data.dailyLimitAf !== undefined
        ? { dailyLimitAf: BigInt(parsed.data.dailyLimitAf) }
        : {}),
      updatedAt: new Date(),
    },
  });

  revalidateTag('exchanges');
  return { success: true, data: mapExchange(row) };
}

// ─── STATUS TOGGLE ───────────────────────────────────────────────────────────

export async function setExchangeStatus(
  id: string,
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'PENDING',
): Promise<ActionResult<{ id: string; status: string }>> {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  const row = await prisma.exchange.update({
    where: { id },
    data: { status, updatedAt: new Date() },
    select: { id: true, status: true },
  });

  revalidateTag('exchanges');
  return { success: true, data: row };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteExchange(id: string): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  await prisma.exchange.delete({ where: { id } });
  revalidateTag('exchanges');
  return { success: true, data: { id } };
}

// ─── STAFF ───────────────────────────────────────────────────────────────────

export type ExchangeStaffRow = {
  id: string;
  exchangeId: string;
  userId: string;
  role: string;
  title: string | null;
  permissions: string[];
  joinedAt: Date;
  revokedAt: Date | null;
  user: { name: string | null; email: string; image: string | null };
};

export async function getExchangeStaff(exchangeId: string): Promise<ExchangeStaffRow[]> {
  const rows = await prisma.exchangeStaff.findMany({
    where: { exchangeId, revokedAt: null },
    include: { User: { select: { name: true, email: true, image: true } } },
    orderBy: { joinedAt: 'asc' },
  });
  return rows.map((r) => ({
    id: r.id,
    exchangeId: r.exchangeId,
    userId: r.userId,
    role: r.role,
    title: r.title,
    permissions: r.permissions,
    joinedAt: r.joinedAt,
    revokedAt: r.revokedAt,
    user: r.User,
  }));
}

export async function addExchangeStaff(
  exchangeId: string,
  userEmail: string,
  role: 'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER',
): Promise<ActionResult<ExchangeStaffRow>> {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) {
    return {
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'کاربری با این ایمیل یافت نشد' },
    };
  }

  const existing = await prisma.exchangeStaff.findUnique({
    where: { exchangeId_userId: { exchangeId, userId: user.id } },
  });

  if (existing && !existing.revokedAt) {
    return {
      success: false,
      error: { code: 'ALREADY_MEMBER', message: 'این کاربر قبلاً عضو این صرافی است' },
    };
  }

  const staff = await prisma.exchangeStaff.upsert({
    where: { exchangeId_userId: { exchangeId, userId: user.id } },
    create: {
      id: createId(),
      exchangeId,
      userId: user.id,
      role,
      joinedAt: new Date(),
      invitedBy: auth.user.id,
    },
    update: { role, revokedAt: null, joinedAt: new Date() },
    include: { User: { select: { name: true, email: true, image: true } } },
  });

  revalidateTag('exchanges');
  return {
    success: true,
    data: {
      id: staff.id,
      exchangeId: staff.exchangeId,
      userId: staff.userId,
      role: staff.role,
      title: staff.title,
      permissions: staff.permissions,
      joinedAt: staff.joinedAt,
      revokedAt: staff.revokedAt,
      user: staff.User,
    },
  };
}

export async function revokeExchangeStaff(staffId: string): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  await prisma.exchangeStaff.update({
    where: { id: staffId },
    data: { revokedAt: new Date() },
  });

  revalidateTag('exchanges');
  return { success: true, data: { id: staffId } };
}

// ─── UPDATE SELF (توسط OWNER/MANAGER صرافی خودش) ─────────────────────────────

const ExchangeSelfUpdateSchema = z.object({
  name: z.string().min(2, 'نام صرافی حداقل ۲ کاراکتر').max(120).optional(),
  licenseNo: z.string().max(60).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email('ایمیل نامعتبر').nullable().optional(),
  logoUrl: z.string().url('آدرس لوگو نامعتبر').nullable().optional(),
  dailyLimitAf: z.number().int().min(0).optional(),
  requireKyc: z.boolean().optional(),
});

/**
 * updateExchangeSelf — ویرایش اطلاعات صرافی توسط OWNER یا MANAGER همان صرافی.
 * برخلاف updateExchange که نیاز به admin دارد، این action tenant-scoped است.
 */
export async function updateExchangeSelf(
  exchangeId: string,
  raw: unknown,
): Promise<ActionResult<ExchangeRow>> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  // platform admin هم اجازه دارد
  if (auth.user.role !== 'OWNER' && auth.user.role !== 'ADMIN') {
    const staff = await prisma.exchangeStaff.findFirst({
      where: { exchangeId, userId: auth.user.id, revokedAt: null },
    });
    if (!staff || !['OWNER', 'MANAGER'].includes(staff.role)) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'فقط مالک یا مدیر صرافی می‌تواند تنظیمات را ویرایش کند',
        },
      };
    }
  }

  const parsed = ExchangeSelfUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'داده نامعتبر' },
    };
  }

  const row = await prisma.exchange.update({
    where: { id: exchangeId },
    data: {
      ...parsed.data,
      ...(parsed.data.dailyLimitAf !== undefined
        ? { dailyLimitAf: BigInt(parsed.data.dailyLimitAf) }
        : {}),
      updatedAt: new Date(),
    },
  });

  revalidateTag('exchanges');
  return { success: true, data: mapExchange(row) };
}
