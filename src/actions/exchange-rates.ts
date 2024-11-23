'use server';

import prisma from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult, ExchangeRateData } from '@/types/types';

const exchangeRateSchema = z.object({
  name: z.string(),
  currency: z.string(),
  rateType: z.enum(['BUY_SELL', 'SINGLE_BULK']),
  buyRate: z.string().optional(),
  sellRate: z.string().optional(),
  singleRate: z.string().optional(),
  bulkRate: z.string().optional(),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
});

export async function getExchangeRates(): Promise<ExchangeRateData[]> {
  const exchangeRates = await prisma.exchangeRate.findMany({
    orderBy: [{ createdAt: 'desc' }],
  });
  return exchangeRates;
}

export async function createExchangeRate(
  data: Omit<ExchangeRateData, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ActionResult<ExchangeRateData>> {
  try {
    const validationResult = exchangeRateSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        message: `Invalid data: ${validationResult.error.message}`,
        error: validationResult.error.message,
      };
    }

    const newExchangeRate = await prisma.exchangeRate.create({
      data: validationResult.data,
    });

    revalidatePath('/dashboard/admin/exchange-rates');

    return {
      success: true,
      variant: 'success',
      message: 'ارز با موفقیت ایجاد شد.',
      data: newExchangeRate,
    };
  } catch (error) {
    console.error('خطا در ایجاد ارز:', error);
    return {
      success: false,
      variant: 'destructive',
      message: 'خطا در ایجاد ارز. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function updateExchangeRate(
  id: string,
  data: Partial<Omit<ExchangeRateData, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<ActionResult<ExchangeRateData>> {
  try {
    const validationResult = exchangeRateSchema.partial().safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        variant: 'destructive',
        message: `Invalid data: ${validationResult.error.message}`,
        error: validationResult.error.message,
      };
    }

    const updatedExchangeRate = await prisma.exchangeRate.update({
      where: { id },
      data: validationResult.data,
    });

    revalidatePath('/dashboard/admin/exchange-rates');

    return {
      success: true,
      variant: 'success',
      message: 'ارز با موفقیت به‌روزرسانی شد.',
      data: updatedExchangeRate,
    };
  } catch (error) {
    console.error('خطا در به‌روزرسانی ارز:', error);
    return {
      success: false,
      message: 'خطا در به‌روزرسانی ارز. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function deleteExchangeRate(id: string): Promise<ActionResult> {
  try {
    await prisma.exchangeRate.delete({ where: { id } });
    revalidatePath('/dashboard/admin/exchange-rates');
    return {
      success: true,
      variant: 'info',
      message: 'نرخ ارز با موفقیت حذف شد.',
    };
  } catch (error) {
    console.error('خطا در حذف نرخ ارز:', error);
    return {
      success: false,
      variant: 'destructive',
      message: 'خطا در حذف نرخ ارز. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
