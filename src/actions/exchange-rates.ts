'use server';

import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { safeRevalidateTag } from '@/lib/safe-cache';
import type { ExchangeRateData, FintechActionResult } from '@/types/types';
import { unstable_cache } from 'next/cache';
import { z } from 'zod';

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

// C4: getExchangeRates با caching (۶۰ ثانیه مثل بقیه)
const _getExchangeRatesCached = unstable_cache(
  async () => {
    return prisma.exchangeRate.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
  },
  ['exchange-rates:list:v1'],
  { revalidate: 60, tags: ['market-rates:exchange-rates', 'exchange-rates'] },
);

export async function getExchangeRates(): Promise<ExchangeRateData[]> {
  return _getExchangeRatesCached();
}

export async function createExchangeRate(
  data: Omit<ExchangeRateData, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<FintechActionResult<ExchangeRateData>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) {
      return { success: false, error: { code: authCheck.code, message: authCheck.message } };
    }
    const validationResult = exchangeRateSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: validationResult.error.errors[0]?.message ?? 'داده نامعتبر',
        },
      };
    }

    const newExchangeRate = await prisma.exchangeRate.create({
      data: validationResult.data,
    });

    revalidateTag('market-rates:ticker');
    revalidateTag('market-rates:exchange-rates');
    safeRevalidateTag('exchange-rates');

    return { success: true, data: newExchangeRate };
  } catch (error) {
    return {
      success: false,
      error: { code: 'DB_ERROR', message: 'خطا در ایجاد ارز' },
    };
  }
}

export async function updateExchangeRate(
  id: string,
  data: Partial<Omit<ExchangeRateData, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<FintechActionResult<ExchangeRateData>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) {
      return { success: false, error: { code: authCheck.code, message: authCheck.message } };
    }
    const validationResult = exchangeRateSchema.partial().safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: validationResult.error.errors[0]?.message ?? 'داده نامعتبر',
        },
      };
    }

    const updatedExchangeRate = await prisma.exchangeRate.update({
      where: { id },
      data: validationResult.data,
    });

    revalidateTag('market-rates:ticker');
    revalidateTag('market-rates:exchange-rates');
    safeRevalidateTag('exchange-rates');

    return { success: true, data: updatedExchangeRate };
  } catch (error) {
    return {
      success: false,
      error: { code: 'DB_ERROR', message: 'خطا در به‌روزرسانی ارز' },
    };
  }
}

export async function deleteExchangeRate(id: string): Promise<FintechActionResult<{ id: string }>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) {
      return { success: false, error: { code: authCheck.code, message: authCheck.message } };
    }
    await prisma.exchangeRate.delete({ where: { id } });

    revalidateTag('market-rates:ticker');
    revalidateTag('market-rates:exchange-rates');
    safeRevalidateTag('exchange-rates');

    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: { code: 'DB_ERROR', message: 'خطا در حذف نرخ ارز' },
    };
  }
}
