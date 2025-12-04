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
      <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 bg-white dark:bg-neutral-800/80 rounded-xl sm:rounded-2xl border border-neutral-100 dark:border-neutral-700/50 min-h-[80px] sm:min-h-[100px] w-full transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/10 dark:hover:shadow-primary-500/5 hover:border-primary-200 dark:hover:border-primary-700/50 hover:-translate-y-0.5 overflow-hidden">
        {/* Background Gradient on Hover */}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
          isPositive 
            ? 'bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-900/10' 
            : 'bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-900/10'
        }`} />

        {/* Icon Container */}
        <div className="relative flex-shrink-0">
          <div className="relative w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center shadow-sm">
            <CurrencyIcon symbol={symbol} className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
        </div>

        {/* Content */}
        <div className="relative flex flex-col justify-between flex-grow min-w-0 gap-0.5 sm:gap-1">
          {/* Top Row */}
          <div className="flex justify-between items-center w-full">
            <h3 className="text-xs sm:text-sm font-bold truncate text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {symbol}
            </h3>
            <div className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${
              isPositive 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {isPositive ? (
                <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              ) : (
                <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              )}
              <span>{isPositive ? '+' : ''}{change.toFixed(2)}%</span>
            </div>
          </div>

          {/* Prices */}
          <div className="space-y-0">
            <p className="text-sm sm:text-base font-bold text-neutral-800 dark:text-neutral-200 tabular-nums">
              ${displayPrice}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
              {formattedIrrPrice} <span className="text-neutral-400 dark:text-neutral-500">تومان</span>
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
