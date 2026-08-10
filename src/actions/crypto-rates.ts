'use server';

import { serverLog } from '@/lib/server-logger';
import { tieredCache } from '@/lib/tiered-cache';
import { getExirCryptoRates } from '../lib/exir-crypto-rates';

export type CryptoRate = {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
};

// دریافت نرخ‌ها از Exir با کش ۶۰ ثانیه‌ای.
// قبلاً داده‌های شبیه‌سازی‌شده با Math.random برمی‌گرداند — حالا داده واقعی
// از API صرافی Exir (با fallback امن به mock در صورت قطعی سرویس).
export const getLiveCryptoRates = tieredCache(
  async (): Promise<CryptoRate[]> => {
    try {
      const result = await getExirCryptoRates();
      if (!result.success || !result.data) return [];

      // CryptoTickerRate → CryptoRate (فیلدهای عمومی + USDT-اقتباس)
      return result.data.map((r) => ({
        symbol: r.symbol,
        name: r.symbol,
        price: r.usdtPrice,
        change24h: Number(r.change ?? 0),
      }));
    } catch (error) {
      serverLog.error('crypto-rates', 'Error fetching crypto rates', error);
      return [];
    }
  },
  [],
  {
    key: 'crypto:live-rates',
    l1Ttl: 30,
    l2Ttl: 120,
    tags: ['crypto-rates'],
  },
);
