'use server';

import prisma from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult, ExchangeRateData } from '@/types/types';

// Zod schema for validation
const exchangeRateSchema = z.object({
  name: z.string(),
  currency: z.string(),
  buyRate: z.number(),
  sellRate: z.number(),
  imageUrl: z.string().optional(),
  minimumAmount: z.number(),
});

// Get all exchange rates
export async function getExchangeRates(): Promise<ExchangeRateData[]> {
  const exchangeRates = await prisma.exchangeRate.findMany({
    orderBy: [{ name: 'asc' }],
  });
  return exchangeRates;
}

// Create a new exchange rate
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

// Update an existing exchange rate
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

// Delete an exchange rate
export async function deleteExchangeRate(id: string): Promise<ActionResult> {
  try {
    await prisma.exchangeRate.delete({ where: { id } });
    revalidatePath('/dashboard/admin/exchange-rates');
    return {
      success: true,
      variant: 'info',
      message: 'ارز با موفقیت حذف شد.',
    };
  } catch (error) {
    console.error('خطا در حذف ارز:', error);
    return {
      success: false,
      variant: 'destructive',
      message: 'خطا در حذف ارز. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
