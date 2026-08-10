'use client';

import { rialToToman } from '@/lib/market-rates/units';
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
 *  - قیمت تومان: از `rialToToman(irrPrice)` به دست میاد. اگر عدد نهایی زیر ۱ باشه
 *    (مثل SHIB)، ۴ رقم اعشار نشون داده می‌شه تا «۰ تومان» بی‌معنا
 *    ظاهر نشه.
 */
export function CryptoTickerCard({ rate }: CryptoTickerCardProps) {
  const { symbol, usdtPrice, irrPrice, change, globalPrice } = rate;
  const isPositive = change >= 0;

  // قیمت تومان: بیشتر ارزها عدد بزرگی دارن، ولی SHIB و امثال آن
  // زیر ۱ تومان هستن. فرمت‌کننده بر اساس بزرگی عدد عوض می‌شه.
  const tomanValue = rialToToman(irrPrice);
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
    <Link href={coinMarketCapUrl} target="_blank" rel="noopener noreferrer" className="block group">
      <div
        className="flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 whitespace-nowrap min-h-[44px] sm:min-h-[50px]"
        style={{
          background: 'var(--ds-surface-elevated)',
          borderRadius: 'var(--ds-radius-xl)',
          border: '1px solid var(--ds-border-subtle)',
          transition: 'all var(--ds-duration-base) cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: '0 1px 2px oklch(0% 0 0 / 0.04)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--ds-brand-500)';
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            '0 4px 12px -4px oklch(52% 0.14 162 / 0.25)';
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--ds-border-subtle)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 2px oklch(0% 0 0 / 0.04)';
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        }}
      >
        <CurrencyIcon symbol={symbol} className="w-5 h-5 sm:w-5 sm:h-5 shrink-0" />

        <span
          className="text-xs sm:text-xs font-bold tabular-nums"
          style={{ color: 'var(--ds-text-primary)' }}
        >
          {symbol}
        </span>

        <span
          className="text-xs sm:text-xs font-semibold tabular-nums"
          style={{ color: 'var(--ds-text-primary)' }}
        >
          ${displayPrice}
        </span>

        <span
          className="hidden sm:inline text-[11px] tabular-nums"
          style={{ color: 'var(--ds-text-muted)' }}
        >
          {formattedToman} تومان
        </span>

        <span
          className={`flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${
            isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
          }`}
        >
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isPositive ? '+' : ''}
          {change.toFixed(2)}%
        </span>
      </div>
    </Link>
  );
}
