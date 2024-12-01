'use server';

import prisma from '@/lib/db';
import { revalidatePath } from 'next/cache';
import type { ActionResult, RateListData } from '@/types/types';

export async function getRateLists(): Promise<RateListData[]> {
  try {
    const rateLists = await prisma.rateList.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rateLists;
  } catch (error) {
    console.error('Error fetching rate lists:', error);
    throw new Error('Failed to fetch rate lists');
  }
}

export async function createRateList(
  data: Omit<RateListData, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ActionResult<RateListData>> {
  try {
    const rateList = await prisma.rateList.create({
      data: {
        title: data.title,
        rates: data.rates,
        isActive: data.isActive,
      },
    });

    revalidatePath('/dashboard/rate-lists');

    return {
      success: true,
      variant: 'success',
      message: 'لیست نرخ با موفقیت ایجاد شد',
      data: rateList,
    };
  } catch (error) {
    console.error('Error creating rate list:', error);
    return {
      success: false,
      variant: 'destructive',
      message: 'خطا در ایجاد لیست نرخ',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function updateRateList(
  id: string,
  data: Partial<Omit<RateListData, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<ActionResult<RateListData>> {
  try {
    const rateList = await prisma.rateList.update({
      where: { id },
      data: {
        title: data.title,
        rates: data.rates,
        isActive: data.isActive,
      },
    });

    revalidatePath('/dashboard/rate-lists');

    return {
      success: true,
      variant: 'success',
      message: 'لیست نرخ با موفقیت به‌روزرسانی شد',
      data: rateList,
    };
  } catch (error) {
    console.error('Error updating rate list:', error);
    return {
      success: false,
      variant: 'destructive',
      message: 'خطا در به‌روزرسانی لیست نرخ',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function deleteRateList(id: string): Promise<ActionResult> {
  try {
    await prisma.rateList.delete({ where: { id } });
    revalidatePath('/dashboard/rate-lists');
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
