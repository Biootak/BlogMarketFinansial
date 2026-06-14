/**
 * getMarketTickerRates — نرخ‌های بازار واقعی (طلا، ارز، سکه، نفت)
 *
 * دیتا از جدول `ExchangeRate` خونده می‌شه (admin-managed).
 * این آیتم‌ها در MarketTickerBar پایین اسلایدر اصلی استفاده می‌شن.
 *
 * نکته: برای بالای صفحه (PulseSection) از `getMarketTickerData` استفاده
 * می‌شه که crypto + forex/gold رو ترکیب می‌کنه. این اکشن فقط forex/gold
 * رو برمی‌گردونه (بدون crypto) تا ردیف پایین خلاصه‌ی بازار واقعی باشه.
 *
 * کش: unstable_cache با 60s TTL (هم‌راستا با سایر تیکرها).
 */

import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';

export interface MarketRateItem {
  /** نماد (مثل USD، GOLD، COIN) */
  symbol: string;
  /** نام فارسی */
  name: string;
  /** قیمت به تومان (از buyRate یا singleRate) */
  price: number;
  /** درصد تغییر (اگه buy/sell موجود باشه) */
  change: number;
}

const CRYPTO_LIKE = new Set(['BTC', 'ETH', 'USDT', 'XRP', 'LTC', 'BCH', 'EOS', 'XLM', 'TRX', 'LINK', 'UNI', 'AAVE', 'DOT', 'ADA', 'DOGE', 'SHIB', 'MATIC', 'SOL', 'AVAX', 'ATOM', 'FTM', 'SAND', 'MANA', 'AXS']);

async function loadMarketRates(): Promise<MarketRateItem[]> {
  try {
    const dbRates = await prisma.exchangeRate.findMany({
      take: 40,
      orderBy: { createdAt: 'desc' },
    });

    const items: MarketRateItem[] = [];
    for (const rate of dbRates) {
      const currency = rate.currency.toUpperCase();
      // فیلتر: موارد crypto-like (اگه اشتباهی وارد DB شدن) رو حذف کن
      if (CRYPTO_LIKE.has(currency)) continue;

      const value = rate.buyRate || rate.singleRate;
      if (!value) continue;
      const price = parseFloat(value);
      if (Number.isNaN(price) || price <= 0) continue;

      let change = 0;
      if (rate.buyRate && rate.sellRate) {
        const buy = parseFloat(rate.buyRate);
        const sell = parseFloat(rate.sellRate);
        if (buy > 0) {
          change = Number((((sell - buy) / buy) * 100).toFixed(2));
        }
      }

      items.push({
        symbol: currency,
        name: rate.name || currency,
        price,
        change,
      });
    }

    // Dedupe by symbol — اولین occurrence (جدیدترین) نگه داشته می‌شه
    const seen = new Set<string>();
    const unique: MarketRateItem[] = [];
    for (const item of items) {
      if (seen.has(item.symbol)) continue;
      seen.add(item.symbol);
      unique.push(item);
    }

    return unique;
  } catch {
    return [];
  }
}

export const getMarketTickerRates = unstable_cache(
  loadMarketRates,
  ['market-ticker-rates', 'v1-2026-06-14'],
  {
    revalidate: 60,
    tags: ['ticker', 'exchange-rates'],
  },
);
