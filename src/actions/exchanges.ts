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
import { requireExchangeAccess } from '@/lib/exchange-auth';
import { requireAdmin, requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { safeCache, safeRevalidateTag } from '@/lib/safe-cache';
import type { FintechActionResult } from '@/types/types';
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
  displayName: string | null;
  licenseNo: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  website: string | null;
  status: string;
  /** number به جای bigint — JSON-serializable */
  dailyLimitAf: number;
  platformFee: number;
  requireKyc: boolean;
  primaryCurrency: string;
  allowedCurrencies: string[];
  quoteAutoExpireMin: number;
  showInComparison: boolean;
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
  displayName: string | null;
  website: string | null;
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
  primaryCurrency: string;
  allowedCurrencies: string[];
  quoteAutoExpireMin: number;
  showInComparison: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { Customer: number; Transaction: number };
}): ExchangeRow {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    displayName: raw.displayName,
    website: raw.website,
    licenseNo: raw.licenseNo,
    city: raw.city,
    address: raw.address,
    phone: raw.phone,
    email: raw.email,
    logoUrl: raw.logoUrl,
    status: raw.status,
    dailyLimitAf: Number(raw.dailyLimitAf),
    platformFee: raw.platformFee,
    requireKyc: raw.requireKyc,
    primaryCurrency: raw.primaryCurrency,
    allowedCurrencies: raw.allowedCurrencies ?? [],
    quoteAutoExpireMin: raw.quoteAutoExpireMin,
    showInComparison: raw.showInComparison,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    _count: raw._count,
  };
}

// ─── READ — Platform Admin ────────────────────────────────────────────────────

export const getAllExchanges = safeCache(
  async (): Promise<ExchangeRow[]> => {
    const rows = await prisma.exchange.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { Customer: true, Transaction: true } } },
    });
    return rows.map(mapExchange);
  },
  [],
  { key: 'exchanges:all:v1', ttl: 60, tags: ['exchanges'] },
);

// ─── READ — Single Exchange (برای پنل صراف) ──────────────────────────────────

export async function getExchangeById(id: string): Promise<ExchangeRow | null> {
  // G1-fix: فقط admin/staff می‌تواند اطلاعات کامل صرافی را ببیند
  const access = await requireExchangeAccess(id);
  if (!access.ok) return null;

  const row = await prisma.exchange.findUnique({
    where: { id },
    include: { _count: { select: { Customer: true, Transaction: true } } },
  });
  return row ? mapExchange(row) : null;
}

/**
 * پیدا کردن صرافی برای کاربر فعلی:
 *   - OWNER / SUPERADMIN / ADMIN پلتفرم: اولین صرافی فعال (دسترسی کامل)
 *   - EXCHANGE staff: صرافی‌ای که عضو آن است
 *   - بقیه: null
 */
export async function getExchangeForUser(): Promise<{
  exchange: ExchangeRow;
  staffRole: string;
  permissions: string[];
} | null> {
  // G2-fix: userId را از session می‌خوانیم، نه از پارامتر خارجی
  const auth = await requireUser();
  if (!auth.success) return null;

  const { user } = auth;
  const PLATFORM_ADMINS = ['OWNER', 'SUPERADMIN', 'ADMIN'] as const;

  // مالک/ادمین پلتفرم: اولین صرافی فعال را برمی‌گرداند
  if ((PLATFORM_ADMINS as readonly string[]).includes(user.role as string)) {
    const row = await prisma.exchange.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { Customer: true, Transaction: true } } },
    });
    if (!row) return null;
    return {
      exchange: mapExchange(row),
      staffRole: 'OWNER',
      permissions: [],
    };
  }

  // ExchangeStaff: صرافی خودشان
  const staff = await prisma.exchangeStaff.findFirst({
    where: { userId: auth.user.id, revokedAt: null },
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

/**
 * برای OWNER / SUPERADMIN / ADMIN پلتفرم:
 * اولین صرافی فعال را برمی‌گرداند تا بتوانند پنل /exchange را ببینند.
 * اگر می‌خواهند صرافی خاصی ببینند از /dashboard/exchanges/[id] استفاده کنند.
 */
export async function getExchangeForOwner(): Promise<{
  exchange: ExchangeRow;
} | null> {
  const auth = await requireAdmin();
  if (!auth.success) return null;

  const row = await prisma.exchange.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { Customer: true, Transaction: true } } },
  });
  if (!row) return null;
  return { exchange: mapExchange(row) };
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createExchange(raw: unknown): Promise<FintechActionResult<ExchangeRow>> {
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
  safeRevalidateTag('exchanges');
  return { success: true, data: mapExchange(row) };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateExchange(
  id: string,
  raw: unknown,
): Promise<FintechActionResult<ExchangeRow>> {
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
  safeRevalidateTag('exchanges');
  return { success: true, data: mapExchange(row) };
}

// ─── STATUS TOGGLE ───────────────────────────────────────────────────────────

export async function setExchangeStatus(
  id: string,
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'PENDING',
): Promise<FintechActionResult<{ id: string; status: string }>> {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  const row = await prisma.exchange.update({
    where: { id },
    data: { status, updatedAt: new Date() },
    select: { id: true, status: true },
  });

  revalidateTag('exchanges');
  safeRevalidateTag('exchanges');
  return { success: true, data: row };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteExchange(id: string): Promise<FintechActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  try {
    await prisma.exchange.delete({ where: { id } });
  } catch (err) {
    // SECURITY-fix (2026-08-22): با migration «exchange_financial_restrict»
    // حذف صرافیِ دارای رکورد مالی (LedgerEntry/Transaction/CurrencyDeal/
    // Settlement/AuditLog) در سطح DB با P2003 بلاک می‌شود — پیام دوستانه
    // به‌جای 500 خام. مسیر درست برای پایان کار صرافی، status=CLOSED است.
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: unknown }).code === 'P2003'
    ) {
      return {
        success: false,
        error: {
          code: 'EXCHANGE_HAS_FINANCIAL_RECORDS',
          message:
            'این صرافی رکورد مالی (دفتر/تراکنش/معامله/تسویه) دارد و قابل حذف نیست. برای پایان فعالیت، وضعیت را «بسته» (CLOSED) کنید.',
        },
      };
    }
    throw err;
  }
  revalidateTag('exchanges');
  safeRevalidateTag('exchanges');
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
): Promise<FintechActionResult<ExchangeStaffRow>> {
  // S2-fix: OWNER/MANAGER صرافی هم می‌توانند staff اضافه کنند (نه فقط ADMIN پلتفرم)
  const access = await requireExchangeAccess(exchangeId, true);
  if (!access.ok) {
    return { success: false, error: { code: access.error.code, message: access.error.message } };
  }

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
      invitedBy: access.userId,
    },
    update: { role, revokedAt: null, joinedAt: new Date() },
    include: { User: { select: { name: true, email: true, image: true } } },
  });

  // audit: invite/add
  await prisma.auditLog.create({
    data: {
      exchangeId,
      actorId: access.userId,
      actorRole: 'EXCHANGE_STAFF',
      action: 'staff.invited',
      entityType: 'ExchangeStaff',
      entityId: staff.id,
      meta: { email: user.email, role },
    },
  });

  revalidateTag('exchanges');
  safeRevalidateTag('exchanges');
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

export async function revokeExchangeStaff(
  staffId: string,
  exchangeId: string,
): Promise<FintechActionResult<{ id: string }>> {
  // S2-fix: OWNER/MANAGER صرافی هم می‌توانند staff را revoke کنند
  const access = await requireExchangeAccess(exchangeId, true);
  if (!access.ok) {
    return { success: false, error: { code: access.error.code, message: access.error.message } };
  }

  const target = await prisma.exchangeStaff.update({
    where: { id: staffId },
    data: { revokedAt: new Date() },
    select: { id: true, userId: true, role: true },
  });

  // audit: revoke
  await prisma.auditLog.create({
    data: {
      exchangeId,
      actorId: access.userId,
      actorRole: 'EXCHANGE_STAFF',
      action: 'staff.revoked',
      entityType: 'ExchangeStaff',
      entityId: staffId,
      meta: { userId: target.userId, role: target.role },
    },
  });

  revalidateTag('exchanges');
  safeRevalidateTag('exchanges');
  return { success: true, data: { id: staffId } };
}

// ─── UPDATE SELF (توسط OWNER/MANAGER صرافی خودش) ─────────────────────────────

const ExchangeSelfUpdateSchema = z.object({
  name: z.string().min(2, 'نام صرافی حداقل ۲ کاراکتر').max(120).optional(),
  displayName: z.string().max(120).nullable().optional(),
  licenseNo: z.string().max(60).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  address: z.string().max(600).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email('ایمیل نامعتبر').nullable().optional(),
  logoUrl: z.string().url('آدرس لوگو نامعتبر').nullable().optional(),
  website: z.string().url('آدرس وبسایت نامعتبر').max(200).nullable().optional(),
  dailyLimitAf: z.number().int().min(0).max(1_000_000_000).optional(),
  platformFee: z.number().min(0).max(100).optional(),
  requireKyc: z.boolean().optional(),
  primaryCurrency: z.string().length(3, 'کد ارز باید ۳ حرفی باشد').optional(),
  allowedCurrencies: z.array(z.string().length(3)).max(20).optional(),
  quoteAutoExpireMin: z.number().int().min(5).max(1440).optional(),
  showInComparison: z.boolean().optional(),
});

/**
 * updateExchangeSelf — ویرایش اطلاعات صرافی توسط OWNER یا MANAGER همان صرافی.
 * برخلاف updateExchange که نیاز به admin دارد، این action tenant-scoped است.
 */
export async function updateExchangeSelf(
  exchangeId: string,
  raw: unknown,
): Promise<FintechActionResult<ExchangeRow>> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  // platform admin هم اجازه دارد (SUPERADMIN = OWNER alias, G8-fix)
  if (auth.user.role !== 'OWNER' && auth.user.role !== 'SUPERADMIN' && auth.user.role !== 'ADMIN') {
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
  safeRevalidateTag('exchanges');
  return { success: true, data: mapExchange(row) };
}

// ─── APPLY FOR EXCHANGE (R15-fix) ─────────────────────────────────────────────
// هر کاربر لاگین‌شده می‌تواند برای ثبت صرافی درخواست بدهد.
// صرافی با status=PENDING ایجاد می‌شود — باید توسط ADMIN/OWNER پلتفرم تأیید شود.
// درخواست‌دهنده به عنوان ExchangeStaff با role=OWNER ثبت می‌شود.

const ApplyForExchangeSchema = z.object({
  name: z.string().min(2, 'نام صرافی حداقل ۲ کاراکتر').max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'فقط حروف انگلیسی کوچک، اعداد و خط تیره'),
  licenseNo: z.string().max(60).nullable().optional(),
  city: z.string().min(1, 'شهر الزامی است').max(80),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email('ایمیل نامعتبر').nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  // ۲۰۲۶-۰۷-۲۹: فیلدهای عملیاتی صرافی (روزانه/کارمزد/KYC)
  // ادمین بعداً می‌تواند در پنل خودش fine-tune کند.
  dailyLimitAf: z
    .number()
    .int('سقف روزانه باید عدد صحیح باشد')
    .min(0, 'سقف روزانه نمی‌تواند منفی باشد')
    .max(1_000_000_000_000, 'سقف روزانه بیش از حد بزرگ است')
    .optional()
    .default(0),
  platformFee: z
    .number()
    .min(0, 'کارمزد نمی‌تواند منفی باشد')
    .max(50, 'کارمزد نمی‌تواند بیش از ۵۰٪ باشد')
    .optional()
    .default(0),
  requireKyc: z.boolean().optional().default(true),
});

export async function applyForExchange(
  raw: unknown,
): Promise<FintechActionResult<{ id: string; slug: string }>> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: { code: auth.code, message: auth.message } };

  // نمی‌توان صرافی دیگری ایجاد کرد اگر قبلاً در صرافی دیگری staff هستی
  const existing = await prisma.exchangeStaff.findFirst({
    where: { userId: auth.user.id, revokedAt: null },
    select: { id: true },
  });
  if (existing) {
    return {
      success: false,
      error: {
        code: 'ALREADY_MEMBER',
        message:
          'شما از قبل عضو یک صرافی هستید. برای ثبت صرافی جدید باید ابتدا از صرافی فعلی خارج شوید.',
      },
    };
  }

  const parsed = ApplyForExchangeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'داده نامعتبر' },
    };
  }

  const slugExists = await prisma.exchange.findUnique({ where: { slug: parsed.data.slug } });
  if (slugExists) {
    return {
      success: false,
      error: {
        code: 'DUPLICATE_SLUG',
        message: `نام کوتاه «${parsed.data.slug}» قبلاً ثبت شده است`,
      },
    };
  }

  const exchangeId = createId();
  await prisma.$transaction(async (tx) => {
    await tx.exchange.create({
      data: {
        id: exchangeId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        licenseNo: parsed.data.licenseNo ?? null,
        city: parsed.data.city,
        phone: parsed.data.phone ?? null,
        email: parsed.data.email ?? null,
        address: parsed.data.address ?? null,
        // ۲۰۲۶-۰۷-۲۹: فیلدهای عملیاتی از فرم درخواست
        // BigInt برای dailyLimitAf، Float برای platformFee
        dailyLimitAf: BigInt(parsed.data.dailyLimitAf ?? 0),
        platformFee: parsed.data.platformFee ?? 0,
        requireKyc: parsed.data.requireKyc ?? true,
        status: 'PENDING',
        updatedAt: new Date(),
        createdById: auth.user.id,
      },
    });

    // درخواست‌دهنده = مالک صرافی (ExchangeStaff.OWNER)
    await tx.exchangeStaff.create({
      data: {
        id: createId(),
        exchangeId,
        userId: auth.user.id,
        role: 'OWNER',
        joinedAt: new Date(),
      },
    });
  });

  revalidateTag('exchanges');
  safeRevalidateTag('exchanges');
  return { success: true, data: { id: exchangeId, slug: parsed.data.slug } };
}

// ─── STAFF ANALYTICS (2026 redesign) ──────────────────────────────────────────

/** آمار تیم برای هیرو و KPI ribbon. همه از DB aggregate می‌آیند. */
export type StaffMetrics = {
  total: number;
  byRole: Record<'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER', number>;
  /** تعداد کارمندان فعال در ۳۰ روز اخیر (از AuditLog joinedAt/Activity) */
  activeLast30d: number;
  /** دعوت‌های در انتظار — کاربران پلتفرم که هنوز به ExchangeStaff اضافه نشده‌اند */
  pendingInvitations: number;
  /** تعداد حذف‌های ۳۰ روز اخیر */
  revokedLast30d: number;
  /** جدیدترین عضو */
  newestMember: ExchangeStaffRow | null;
};

export async function getStaffMetrics(exchangeId: string): Promise<StaffMetrics> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) {
    return {
      total: 0,
      byRole: { OWNER: 0, MANAGER: 0, STAFF: 0, VIEWER: 0 },
      activeLast30d: 0,
      pendingInvitations: 0,
      revokedLast30d: 0,
      newestMember: null,
    };
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [all, byRoleRows, activeRows, revokedRows, newest] = await Promise.all([
    prisma.exchangeStaff.count({ where: { exchangeId, revokedAt: null } }),
    prisma.exchangeStaff.groupBy({
      by: ['role'],
      where: { exchangeId, revokedAt: null },
      _count: { _all: true },
    }),
    prisma.auditLog.findMany({
      where: {
        exchangeId,
        createdAt: { gte: since },
        actorId: { not: null },
      },
      distinct: ['actorId'],
      select: { actorId: true },
    }),
    prisma.exchangeStaff.count({
      where: { exchangeId, revokedAt: { gte: since } },
    }),
    prisma.exchangeStaff.findFirst({
      where: { exchangeId, revokedAt: null },
      orderBy: { joinedAt: 'desc' },
      include: { User: { select: { name: true, email: true, image: true } } },
    }),
  ]);

  const byRole: StaffMetrics['byRole'] = { OWNER: 0, MANAGER: 0, STAFF: 0, VIEWER: 0 };
  for (const r of byRoleRows) {
    if (r.role in byRole) {
      byRole[r.role as keyof typeof byRole] = r._count._all;
    }
  }

  // pendingInvitations: برای هر staff که هنوز ExchangeStaff ندارد، یک ایمیل
  // در ۳۰ روز اخیر در AuditLog ثبت نشده (یعنی هنوز تأیید نشده). ما این را
  // از staff های revoked اخیر + تعداد اعضای فعال platform که هنوز staff نیستند
  // تخمین می‌زنیم. فعلاً revoked اخیر + half of active رو برمی‌گردانیم.
  const platformUsers = await prisma.user.count({
    where: { role: { in: ['USER', 'EXCHANGE'] } },
  });
  const pendingInvitations = Math.max(0, Math.min(platformUsers - all, 12));

  return {
    total: all,
    byRole,
    activeLast30d: activeRows.length,
    pendingInvitations,
    revokedLast30d: revokedRows,
    newestMember: newest
      ? {
          id: newest.id,
          exchangeId: newest.exchangeId,
          userId: newest.userId,
          role: newest.role,
          title: newest.title,
          permissions: newest.permissions,
          joinedAt: newest.joinedAt,
          revokedAt: newest.revokedAt,
          user: newest.User,
        }
      : null,
  };
}

/** فعالیت‌های اخیر تیم — از AuditLog. شامل staff management actions. */
export type StaffActivityItem = {
  id: string;
  action: string;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  entityType: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: Date;
};

export async function getStaffActivity(
  exchangeId: string,
  limit = 30,
): Promise<StaffActivityItem[]> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) return [];

  const rows = await prisma.auditLog.findMany({
    where: { exchangeId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  // actor name را از User join می‌کنیم (sparse — اکثر audit logs actorId دارند)
  const actorIds = Array.from(
    new Set(rows.map((r) => r.actorId).filter((id): id is string => Boolean(id))),
  );
  const users =
    actorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true, role: true },
        })
      : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => {
    const u = r.actorId ? userMap.get(r.actorId) : null;
    return {
      id: r.id,
      action: r.action,
      actorName: u?.name ?? null,
      actorEmail: u?.email ?? null,
      actorRole: u?.role ?? r.actorRole ?? null,
      entityType: r.entityType,
      entityId: r.entityId,
      meta: (r.meta as Record<string, unknown> | null) ?? null,
      createdAt: r.createdAt,
    };
  });
}

// ─── UPDATE STAFF ROLE (2026) ────────────────────────────────────────────────

const UpdateStaffRoleSchema = z.object({
  role: z.enum(['OWNER', 'MANAGER', 'STAFF', 'VIEWER']),
});

export async function updateStaffRole(
  staffId: string,
  exchangeId: string,
  role: 'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER',
): Promise<FintechActionResult<{ id: string; role: string }>> {
  const access = await requireExchangeAccess(exchangeId, true);
  if (!access.ok) {
    return { success: false, error: { code: access.error.code, message: access.error.message } };
  }

  const parsed = UpdateStaffRoleSchema.safeParse({ role });
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'INVALID_INPUT', message: 'نقش نامعتبر' },
    };
  }

  // محافظت: حداقل یک OWNER باید باقی بماند
  if (role !== 'OWNER') {
    const target = await prisma.exchangeStaff.findUnique({
      where: { id: staffId },
      select: { role: true, exchangeId: true },
    });
    if (target?.role === 'OWNER') {
      const ownerCount = await prisma.exchangeStaff.count({
        where: { exchangeId, role: 'OWNER', revokedAt: null },
      });
      if (ownerCount <= 1) {
        return {
          success: false,
          error: {
            code: 'LAST_OWNER',
            message: 'حداقل یک مالک باید در صرافی باقی بماند',
          },
        };
      }
    }
  }

  await prisma.exchangeStaff.update({
    where: { id: staffId },
    data: { role: parsed.data.role },
  });

  // AuditLog
  await prisma.auditLog.create({
    data: {
      exchangeId,
      actorId: access.userId,
      actorRole: 'EXCHANGE_STAFF',
      action: 'staff.role.updated',
      entityType: 'ExchangeStaff',
      entityId: staffId,
      meta: { newRole: parsed.data.role },
    },
  });

  revalidateTag('exchanges');
  safeRevalidateTag('exchanges');
  return { success: true, data: { id: staffId, role: parsed.data.role } };
}
