'use server';

/**
 * headerAdActions — مدیریت تبلیغ باریک بالای هدر
 *
 * الگوی هماهنگ با advertisementActions.ts:
 *  - ActionResult<T> با `success / message / data / error (string)`
 *  - unstable_cache با tag 'header-ad' (۶۰ ثانیه TTL)
 *  - revalidateTag پس از هر mutation
 *  - safeAction wrap برای خطاها
 *
 * ساختار singleton:
 *  - در هر لحظه فقط یک تبلیغ فعال می‌تواند داشته باشد
 *  - فعال‌سازی یک تبلیغ، بقیه را غیرفعال می‌کند
 */

import { checkAdmin } from '@/lib/auth';
import prisma from '@/lib/db';
import { revalidateTag } from '@/lib/revalidate';
import { safeCache } from '@/lib/safe-cache';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ۲۰۲۶-۰۶-۱۴: ActionResult مطابق الگوی موجود
export interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Schema اعتبارسنجی ورودی
const HeaderAdInputSchema = z.object({
  text: z
    .string()
    .min(1, 'متن تبلیغ الزامی است')
    .max(200, 'متن تبلیغ نباید بیشتر از ۲۰۰ کاراکتر باشد'),
  subtext: z.string().max(200, 'زیرنویس نباید بیشتر از ۲۰۰ کاراکتر باشد').optional().nullable(),
  ctaLabel: z.string().max(40, 'متن دکمه نباید بیشتر از ۴۰ کاراکتر باشد').optional().nullable(),
  ctaHref: z
    .string()
    .max(500, 'لینک دکمه بسیار طولانی است')
    .refine((v) => !v || v.startsWith('/') || v.startsWith('http://') || v.startsWith('https://'), {
      message: 'فرمت لینک نامعتبر است',
    })
    .optional()
    .nullable(),
  imageUrl: z
    .string()
    .max(500)
    .refine((v) => !v || v.startsWith('/') || v.startsWith('http://') || v.startsWith('https://'), {
      message: 'آدرس تصویر نامعتبر است',
    })
    .optional()
    .nullable(),
  href: z
    .string()
    .max(500)
    .refine((v) => !v || v.startsWith('/') || v.startsWith('http://') || v.startsWith('https://'), {
      message: 'فرمت لینک نامعتبر است',
    })
    .optional()
    .nullable(),
  variant: z.enum(['TEXT', 'IMAGE', 'MIXED']).default('TEXT'),
  theme: z.enum(['PRIMARY', 'ACCENT', 'NEUTRAL', 'DARK', 'GRADIENT']).default('PRIMARY'),
  isActive: z.boolean().default(false),
  priority: z.number().int().min(0).max(1000).default(0),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
});

export type HeaderAdInput = z.infer<typeof HeaderAdInputSchema>;

// ---- Internal helpers (no caching) ----

async function fetchActiveHeaderAdInternal() {
  const now = new Date();
  return prisma.headerAd.findFirst({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    },
    orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
  });
}

async function fetchAllHeaderAdsInternal() {
  return prisma.headerAd.findMany({
    orderBy: [{ isActive: 'desc' }, { priority: 'desc' }, { updatedAt: 'desc' }],
  });
}

// ---- Cached public reads ----
// safeCache (in-memory) works in both dev and prod; unstable_cache is bypassed
// in Next.js dev mode which caused a fresh DB round-trip on every request.

const getCachedActiveHeaderAd = safeCache(fetchActiveHeaderAdInternal, null, {
  key: 'active-header-ad',
  ttl: 60,
  tags: ['header-ad'],
});

/**
 * دریافت تبلیغ فعال هدر برای رندر در فرانت‌اند.
 * توسط Header.tsx صدا زده می‌شود.
 */
export async function getActiveHeaderAd(): Promise<ActionResult<unknown | null>> {
  const ad = await getCachedActiveHeaderAd();
  return { success: true, message: 'تبلیغ فعال یافت شد.', data: ad };
}

/**
 * دریافت همه تبلیغات هدر برای صفحه ادمین.
 */
export async function getAllHeaderAds(): Promise<ActionResult<unknown[]>> {
  try {
    const ads = await fetchAllHeaderAdsInternal();
    return { success: true, message: 'لیست تبلیغات دریافت شد.', data: ads };
  } catch (err) {
    return { success: false, message: 'خطا در دریافت لیست تبلیغات.', error: String(err) };
  }
}

export async function getHeaderAdById(id: string): Promise<ActionResult<unknown>> {
  try {
    const ad = await prisma.headerAd.findUnique({ where: { id } });
    if (!ad) return { success: false, message: 'تبلیغ یافت نشد.' };
    return { success: true, message: 'تبلیغ دریافت شد.', data: ad };
  } catch (err) {
    return { success: false, message: 'خطا در دریافت تبلیغ.', error: String(err) };
  }
}

// ---- Mutations (همه با احراز هویت ادمین) ----

/**
 * ساخت تبلیغ جدید.
 * اگر isActive=true باشد، بقیه غیرفعال می‌شوند (singleton).
 */
export async function createHeaderAd(input: HeaderAdInput): Promise<ActionResult<unknown>> {
  try {
    await checkAdmin();
    const parsed = HeaderAdInputSchema.parse(input);

    if (parsed.isActive) {
      await prisma.headerAd.updateMany({ where: { isActive: true }, data: { isActive: false } });
    }

    const ad = await prisma.headerAd.create({
      data: {
        text: parsed.text,
        subtext: parsed.subtext ?? null,
        ctaLabel: parsed.ctaLabel ?? null,
        ctaHref: parsed.ctaHref ?? null,
        imageUrl: parsed.imageUrl ?? null,
        href: parsed.href ?? null,
        variant: parsed.variant,
        theme: parsed.theme,
        isActive: parsed.isActive,
        priority: parsed.priority,
        startDate: parsed.startDate ?? null,
        endDate: parsed.endDate ?? null,
      },
    });

    revalidateTag('header-ad');
    revalidatePath('/');
    return { success: true, message: 'تبلیغ هدر با موفقیت ایجاد شد.', data: ad };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, message: err.issues[0]?.message ?? 'ورودی نامعتبر است.' };
    }
    return { success: false, message: 'خطا در ایجاد تبلیغ.', error: String(err) };
  }
}

/**
 * به‌روزرسانی تبلیغ هدر.
 */
export async function updateHeaderAd(
  id: string,
  input: Partial<HeaderAdInput>,
): Promise<ActionResult<unknown>> {
  try {
    await checkAdmin();
    const parsed = HeaderAdInputSchema.partial().parse(input);

    if (parsed.isActive) {
      await prisma.headerAd.updateMany({
        where: { isActive: true, NOT: { id } },
        data: { isActive: false },
      });
    }

    const ad = await prisma.headerAd.update({
      where: { id },
      data: {
        ...(parsed.text !== undefined && { text: parsed.text }),
        ...(parsed.subtext !== undefined && { subtext: parsed.subtext }),
        ...(parsed.ctaLabel !== undefined && { ctaLabel: parsed.ctaLabel }),
        ...(parsed.ctaHref !== undefined && { ctaHref: parsed.ctaHref }),
        ...(parsed.imageUrl !== undefined && { imageUrl: parsed.imageUrl }),
        ...(parsed.href !== undefined && { href: parsed.href }),
        ...(parsed.variant !== undefined && { variant: parsed.variant }),
        ...(parsed.theme !== undefined && { theme: parsed.theme }),
        ...(parsed.isActive !== undefined && { isActive: parsed.isActive }),
        ...(parsed.priority !== undefined && { priority: parsed.priority }),
        ...(parsed.startDate !== undefined && { startDate: parsed.startDate }),
        ...(parsed.endDate !== undefined && { endDate: parsed.endDate }),
      },
    });

    revalidateTag('header-ad');
    revalidatePath('/');
    return { success: true, message: 'تبلیغ هدر به‌روزرسانی شد.', data: ad };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, message: err.issues[0]?.message ?? 'ورودی نامعتبر است.' };
    }
    return { success: false, message: 'خطا در به‌روزرسانی تبلیغ.', error: String(err) };
  }
}

/**
 * حذف تبلیغ هدر.
 */
export async function deleteHeaderAd(id: string): Promise<ActionResult> {
  try {
    await checkAdmin();
    await prisma.headerAd.delete({ where: { id } });
    revalidateTag('header-ad');
    revalidatePath('/');
    return { success: true, message: 'تبلیغ هدر حذف شد.' };
  } catch (err) {
    return { success: false, message: 'خطا در حذف تبلیغ.', error: String(err) };
  }
}

/**
 * تغییر سریع وضعیت فعال/غیرفعال.
 */
export async function toggleHeaderAd(id: string): Promise<ActionResult<unknown>> {
  try {
    await checkAdmin();
    const current = await prisma.headerAd.findUnique({ where: { id } });
    if (!current) return { success: false, message: 'تبلیغ یافت نشد.' };

    const nextActive = !current.isActive;

    if (nextActive) {
      await prisma.headerAd.updateMany({
        where: { isActive: true, NOT: { id } },
        data: { isActive: false },
      });
    }

    const ad = await prisma.headerAd.update({
      where: { id },
      data: { isActive: nextActive },
    });

    revalidateTag('header-ad');
    revalidatePath('/');
    return {
      success: true,
      message: nextActive ? 'تبلیغ فعال شد.' : 'تبلیغ غیرفعال شد.',
      data: ad,
    };
  } catch (err) {
    return { success: false, message: 'خطا در تغییر وضعیت.', error: String(err) };
  }
}
