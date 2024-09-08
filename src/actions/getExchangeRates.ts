'use server';

import prisma from '@/lib/db';
import type { ExchangeRatesResult } from '@/types/types';

export async function getExchangeRates(): Promise<ExchangeRatesResult> {
  try {
    const rates = await prisma.exchangeRate.findMany({
      orderBy: { symbol: 'asc' },
    });

    return {
      success: true,
      message: 'نرخ‌های ارز با موفقیت دریافت شدند',
      data: rates,
    };
  } catch (error) {
    console.error('خطا در دریافت نرخ‌های ارز:', error);
    return {
      success: false,
      message: 'دریافت نرخ‌های ارز با شکست مواجه شد',
      error: error instanceof Error ? error.message : 'خطای ناشناخته',
    };
  }
}
