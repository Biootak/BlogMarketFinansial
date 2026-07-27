'use server';

import { safeCache } from '@/lib/safe-cache';

export type CryptoRate = {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
};

// دریافت نرخ‌ها با کش ۱۰ ثانیه‌ای
export const getLiveCryptoRates = safeCache(
  async (): Promise<CryptoRate[]> => {
    try {
      // در یک سناریوی واقعی اینجا به Binance یا CoinGecko متصل می‌شویم
      // برای این پیاده‌سازی، داده‌های شبیه‌سازی شده با نوسان اندک ارائه می‌دهیم
      const baseRates = [
        { symbol: 'BTC', name: 'Bitcoin', price: 65432.1 },
        { symbol: 'ETH', name: 'Ethereum', price: 3456.78 },
        { symbol: 'USDT', name: 'Tether', price: 1.0 },
        { symbol: 'SOL', name: 'Solana', price: 145.67 },
        { symbol: 'BNB', name: 'BNB', price: 580.23 },
      ];

      return baseRates.map((r) => ({
        ...r,
        price: r.price * (1 + (Math.random() * 0.002 - 0.001)), // نوسان ۰.۱٪
        change24h: Number((Math.random() * 10 - 5).toFixed(2)),
      }));
    } catch (error) {
      console.error('Error fetching crypto rates:', error);
      return [];
    }
  },
  [],
  { key: 'crypto:live-rates', ttl: 10 },
);
