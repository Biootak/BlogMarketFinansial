'use client';

import Link from 'next/link';
import type { ExchangeRate } from '@/types/types';
import CurrencyIcon from './CurrencyIcon';
import { getCoinMarketCapUrl } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ExchangeRateCardProps {
  rate: ExchangeRate;
}

export function ExchangeRateCard({ rate }: ExchangeRateCardProps) {
  const { symbol, usdtPrice, irrPrice, change, globalPrice } = rate;
  const isPositive = change >= 0;

  const formattedIrrPrice = Math.floor(irrPrice / 10).toLocaleString('fa-IR');
  const formatPrice = (price: number) =>
    price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });

  const displayPrice = globalPrice ? formatPrice(globalPrice) : formatPrice(usdtPrice);
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
          {formattedIrrPrice} تومان
        </span>

        <span
          className={`flex items-center gap-0.5 text-[10px] font-semibold tabular-nums whitespace-nowrap ${
            isPositive
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
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
