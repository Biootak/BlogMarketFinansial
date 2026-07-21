'use server';

import prisma from '@/lib/db';
import { authFailureToActionResult, requireAdmin } from '@/lib/require-auth';
import { revalidatePath, revalidateTag } from '@/lib/revalidate';
import { safeCache } from '@/lib/safe-cache';
import type { ActionResult, AdPosition, AdSize, Advertisement } from '@/types/types';
import type { Prisma } from '@prisma/client';

// Internal function for fetching ads (not cached)
async function fetchActiveAdsInternal(
  limit: number,
  page: number,
  search: string,
  size: AdSize | undefined,
  position: AdPosition | undefined,
  orderBy: 'order' | 'createdAt' | 'startDate',
  orderDirection: 'asc' | 'desc',
): Promise<ActionResult<Advertisement[]>> {
  try {
    // M13 fix: allowlist the sort field to avoid injecting an arbitrary
    // Prisma orderBy key (defense even though the type already constrains it).
    const safeOrderBy: 'order' | 'createdAt' | 'startDate' =
      orderBy === 'createdAt' || orderBy === 'startDate' || orderBy === 'order' ? orderBy : 'order';
    const safeDirection: 'asc' | 'desc' = orderDirection === 'desc' ? 'desc' : 'asc';
    const skip = (page - 1) * limit;
    const ads = await prisma.advertisement.findMany({
      where: {
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
        size: size ? { equals: size } : undefined,
        position: position ? { equals: position } : undefined,
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      },
      orderBy: { [safeOrderBy]: safeDirection },
      take: limit,
      skip: skip,
    });
    return {
      success: true,
      message: 'تبلیغات فعال با موفقیت بازیابی شدند.',
      data: ads,
    };
  } catch (error) {
    return {
      success: false,
      message: 'خطا در بازیابی تبلیغات. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// 2026-06-21: قبلاً unstable_cache بود که خطای DB را re-throw می‌کرد.
// حالا safeCache — اگر DB قطع باشد، stale value یا fallback.
// Fallback باید ActionResult ساختار داشته باشد تا call-site ها
// بدون تغییر کار کنند.
const EMPTY_ADS_RESULT: ActionResult<Advertisement[]> = {
  success: true,
  message: 'تبلیغات فعال (fallback)',
  data: [],
};

const getCachedActiveAds = safeCache(fetchActiveAdsInternal, EMPTY_ADS_RESULT, {
  key: 'active-advertisements',
  ttl: 300,
  tags: ['advertisements'],
});

// Public API with object params
export async function getActiveAdvertisements({
  limit = 10,
  page = 1,
  search = '',
  size,
  position,
  orderBy = 'order',
  orderDirection = 'asc',
}: {
  limit?: number;
  page?: number;
  search?: string;
  size?: AdSize;
  position?: AdPosition;
  orderBy?: 'order' | 'createdAt' | 'startDate';
  orderDirection?: 'asc' | 'desc';
} = {}): Promise<ActionResult<Advertisement[]>> {
  return getCachedActiveAds(limit, page, search, size, position, orderBy, orderDirection);
}

export async function getAllAdvertisements({
  limit = 10,
  page = 1,
  search = '',
}: {
  limit?: number;
  page?: number;
  search?: string;
} = {}): Promise<ActionResult<{ ads: Advertisement[]; totalCount: number }>> {
  try {
    const skip = (page - 1) * limit;
    const [ads, totalCount] = await Promise.all([
      prisma.advertisement.findMany({
        where: {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: skip,
      }),
      prisma.advertisement.count({
        where: {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      }),
    ]);
    return {
      success: true,
      message: 'تمام تبلیغات با موفقیت بازیابی شدند.',
      data: { ads, totalCount },
    };
  } catch (error) {
    return {
      success: false,
      message: 'خطا در بازیابی تبلیغات. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getAdvertisementById(id: string): Promise<ActionResult<Advertisement>> {
  try {
    const ad = await prisma.advertisement.findUnique({
      where: { id },
    });
    if (!ad) {
      return {
        success: false,
        message: 'تبلیغ مورد نظر یافت نشد.',
      };
    }
    return {
      success: true,
      message: 'تبلیغ با موفقیت بازیابی شد.',
      data: ad,
    };
  } catch (error) {
    return {
      success: false,
      message: 'خطا در بازیابی تبلیغ. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function createAdvertisement(
  data: Omit<Prisma.AdvertisementCreateInput, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ActionResult<Advertisement>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    const newAd = await prisma.advertisement.create({
      data: {
        ...data,
        customDimensions: data.customDimensions
          ? JSON.parse(JSON.stringify(data.customDimensions))
          : null,
      },
    });
    revalidatePath('/advertisements');
    revalidateTag('advertisements');
    return {
      success: true,
      message: 'تبلیغ با موفقیت ایجاد شد.',
      data: newAd,
    };
  } catch (error) {
    return {
      success: false,
      message: 'خطا در ایجاد تبلیغ. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function updateAdvertisement(
  id: string,
  data: Partial<Omit<Prisma.AdvertisementUpdateInput, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<ActionResult<Advertisement>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    const updatedAd = await prisma.advertisement.update({
      where: { id },
      data: {
        ...data,
        customDimensions: data.customDimensions
          ? JSON.parse(JSON.stringify(data.customDimensions))
          : undefined,
      },
    });
    revalidatePath('/advertisements');
    revalidateTag('advertisements');
    return {
      success: true,
      message: 'تبلیغ با موفقیت به‌روزرسانی شد.',
      data: updatedAd,
    };
  } catch (error) {
    return {
      success: false,
      message: 'خطا در به‌روزرسانی تبلیغ. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function deleteAdvertisement(id: string): Promise<ActionResult> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    await prisma.advertisement.delete({ where: { id } });
    revalidatePath('/advertisements');
    revalidateTag('advertisements');
    return {
      success: true,
      message: 'تبلیغ با موفقیت حذف شد.',
    };
  } catch (error) {
    return {
      success: false,
      message: 'خطا در حذف تبلیغ. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
