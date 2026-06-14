'use server';

import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { revalidateTag } from '@/lib/revalidate';
import type { ActionResult, RateListData, RateItem } from '@/types/types';

// 2026-06-14: shared helper to normalize the Json column into a
// typed array. Prisma 6 returns the Json value already parsed, so
// we only do the typeof / array guards — no JSON.parse on the hot
// path.
const normalizeRates = (raw: unknown): RateItem[] => {
  if (Array.isArray(raw)) {
    return raw.map((rate: any) => ({
      title: String(rate?.title ?? ''),
      value: String(rate?.value ?? ''),
    }));
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? normalizeRates(parsed) : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const getRateLists = unstable_cache(
  async (): Promise<RateListData[]> => {
    try {
      const rateLists = await prisma.rateList.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return rateLists.map((list) => ({
        ...list,
        rates: normalizeRates(list.rates),
      }));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching rate lists:', error);
      }
      return [];
    }
  },
  ['rate-lists', 'v1-2026-06-14'],
  {
    revalidate: 300,
    tags: ['rate-lists'],
  },
);

export async function createRateList(
  data: Omit<RateListData, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ActionResult<RateListData>> {
  try {
    // 2026-06-14: Prisma's Json column type serializes for us. The
    // previous `JSON.stringify` was redundant and meant the column
    // stored a string-in-string which broke read paths.
    const rateList = await prisma.rateList.create({
      data: {
        title: data.title,
        rates: data.rates as never,
        isActive: data.isActive,
      },
    });

    revalidatePath('/dashboard/rate-lists');
    revalidateTag('rate-lists');

    return {
      success: true,
      message: 'Rate list created successfully',
      data: {
        ...rateList,
        rates: Array.isArray(data.rates) ? data.rates : [],
      },
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error creating rate list:', error);
    }
    return {
      success: false,
      message: 'خطا در ایجاد لیست نرخ',
    };
  }
}

export async function updateRateList(
  id: string,
  data: Partial<Omit<RateListData, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<ActionResult<RateListData>> {
  try {
    // Same fix as createRateList: don't JSON.stringify the Json
    // column. Let Prisma handle serialization.
    const rateList = await prisma.rateList.update({
      where: { id },
      data: {
        title: data.title,
        rates: (data.rates ?? undefined) as never,
        isActive: data.isActive,
      },
    });

    revalidatePath('/dashboard/rate-lists');
    revalidateTag('rate-lists');

    return {
      success: true,
      message: 'Rate list updated successfully',
      data: {
        ...rateList,
        rates: normalizeRates(rateList.rates),
      },
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error updating rate list:', error);
    }
    return {
      success: false,
      message: 'خطا در به‌روزرسانی لیست نرخ',
    };
  }
}

export async function deleteRateList(id: string): Promise<ActionResult> {
  try {
    await prisma.rateList.delete({ where: { id } });
    revalidatePath('/dashboard/rate-lists');
    revalidateTag('rate-lists');
    return {
      success: true,
      variant: 'success',
      message: 'لیست نرخ با موفقیت حذف شد',
    };
  } catch (error) {
    console.error('Error deleting rate list:', error);
    return {
      success: false,
      variant: 'destructive',
      message: 'خطا در حذف لیست نرخ',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
