'use client';

import { getCoinMarketCapUrl } from '@/lib/utils';
import type { CryptoTickerRate } from '@/types/types';
import { TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import CurrencyIcon from './CurrencyIcon';

interface CryptoTickerCardProps {
  rate: CryptoTickerRate;
}

/**
 * CryptoTickerCard — یک کارت کوچک برای نمایش یک ارز دیجیتال
 * در نوار بالای هوم.
 *
 * قبلاً `ExchangeRateCard` نام داشت که با کارت‌های صرافی
 * (money-transfer/ExchangeRateCard.tsx) و با مدل Prisma `ExchangeRate`
 * تداخل داشت.
 *
 * نکته‌ی فرمت:
 *  - قیمت USD با precision پویا: زیر ۱ دلار ۴ رقم اعشار، بالای ۱ دلار
 *    تا ۲ رقم اعشار (برای SHIB و امثال آن که قیمت‌های زیر ۰.۰۰۰۱ دارن
 *    و قبلاً `$0.00` نشون داده می‌شد).
 *  - قیمت تومان: از `irrPrice/10` به دست میاد. اگر عدد نهایی زیر ۱ باشه
 *    (مثل SHIB)، ۴ رقم اعشار نشون داده می‌شه تا «۰ تومان» بی‌معنا
 *    ظاهر نشه.
 */
export function CryptoTickerCard({ rate }: CryptoTickerCardProps) {
  const { symbol, usdtPrice, irrPrice, change, globalPrice } = rate;
  const isPositive = change >= 0;

  // قیمت تومان: بیشتر ارزها عدد بزرگی دارن، ولی SHIB و امثال آن
  // زیر ۱ تومان هستن. فرمت‌کننده بر اساس بزرگی عدد عوض می‌شه.
  const tomanValue = irrPrice / 10;
  const formattedToman =
    tomanValue >= 1
      ? Math.floor(tomanValue).toLocaleString('fa-IR')
      : tomanValue > 0
        ? tomanValue.toLocaleString('en-US', {
            minimumFractionDigits: 4,
            maximumFractionDigits: 6,
          })
        : '—';

  // قیمت USD: precision پویا برای ارزهای زیر ۱ دلار
  const usdValue = globalPrice ?? usdtPrice;
  const formatUsdPrice = (price: number): string => {
    if (!Number.isFinite(price) || price <= 0) return '—';
    if (price < 0.01) {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 6,
      });
    }
    if (price < 1) {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 4,
      });
    }
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const displayPrice = formatUsdPrice(usdValue);
  const coinMarketCapUrl = getCoinMarketCapUrl(symbol);

  return (
    <Link
      href={coinMarketCapUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full group"
    >
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-neutral-800/80 rounded-lg border border-neutral-100 dark:border-neutral-700/50 w-full transition-colors hover:border-primary-300 dark:hover:border-primary-600">
        <CurrencyIcon symbol={symbol} className="w-4 h-4 shrink-0" />

        <span className="text-[11px] font-bold text-neutral-900 dark:text-neutral-100 truncate">
          {symbol}
        </span>

        <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums whitespace-nowrap">
          ${displayPrice}
        </span>

        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 tabular-nums whitespace-nowrap">
          تومان {formattedToman}
        </span>

        <span
          className={`flex items-center gap-0.5 text-[10px] font-semibold tabular-nums whitespace-nowrap ${
            isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {isPositive ? (
            <TrendingUp className="w-2.5 h-2.5" />
          ) : (
            <TrendingDown className="w-2.5 h-2.5" />
          )}
          {isPositive ? '+' : ''}
          {change.toFixed(2)}%
        </span>
      </div>
    </Link>
  );
}
