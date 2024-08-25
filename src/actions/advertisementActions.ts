'use server';

import prisma from '@/lib/db';
import type { ActionResult, Advertisement, AdSize } from '@/types/types';
import { revalidatePath } from 'next/cache';

export async function getActiveAdvertisements({
  limit = 10,
  page = 1,
  search = '',
  size,
}: {
  limit?: number;
  page?: number;
  search?: string;
  size?: AdSize;
} = {}): Promise<ActionResult<Advertisement[]>> {
  try {
    const skip = (page - 1) * limit;
    const ads = await prisma.advertisement.findMany({
      where: {
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
        size: size ? { equals: size } : undefined,
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      },
      orderBy: { startDate: 'desc' },
      take: limit,
      skip: skip,
    });
    return {
      success: true,
      message: 'تبلیغات فعال با موفقیت بازیابی شدند.',
      data: ads,
    };
  } catch (error) {
    console.error('خطا در بازیابی تبلیغات:', error);
    return {
      success: false,
      message: 'خطا در بازیابی تبلیغات. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
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
    console.error('خطا در بازیابی تبلیغات:', error);
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
    console.error('خطا در بازیابی تبلیغ:', error);
    return {
      success: false,
      message: 'خطا در بازیابی تبلیغ. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function createAdvertisement(
  data: Omit<Advertisement, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ActionResult<Advertisement>> {
  try {
    const newAd = await prisma.advertisement.create({ data });
    revalidatePath('/admin/advertisements');
    return {
      success: true,
      message: 'تبلیغ با موفقیت ایجاد شد.',
      data: newAd,
    };
  } catch (error) {
    console.error('خطا در ایجاد تبلیغ:', error);
    return {
      success: false,
      message: 'خطا در ایجاد تبلیغ. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function updateAdvertisement(
  id: string,
  data: Partial<Omit<Advertisement, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<ActionResult<Advertisement>> {
  try {
    const updatedAd = await prisma.advertisement.update({
      where: { id },
      data,
    });
    revalidatePath('/admin/advertisements');
    return {
      success: true,
      message: 'تبلیغ با موفقیت به‌روزرسانی شد.',
      data: updatedAd,
    };
  } catch (error) {
    console.error('خطا در به‌روزرسانی تبلیغ:', error);
    return {
      success: false,
      message: 'خطا در به‌روزرسانی تبلیغ. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function deleteAdvertisement(id: string): Promise<ActionResult> {
  try {
    await prisma.advertisement.delete({ where: { id } });
    revalidatePath('/admin/advertisements');
    return {
      success: true,
      message: 'تبلیغ با موفقیت حذف شد.',
    };
  } catch (error) {
    console.error('خطا در حذف تبلیغ:', error);
    return {
      success: false,
      message: 'خطا در حذف تبلیغ. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
