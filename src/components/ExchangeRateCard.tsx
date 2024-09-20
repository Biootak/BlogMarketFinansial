'use client';

import Link from 'next/link';
import type { ExchangeRate } from '@/types/types';
import CurrencyIcon from './CurrencyIcon';
import { getCoinMarketCapUrl } from '@/lib/utils';

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
      maximumFractionDigits: 6,
    });

  const displayPrice = globalPrice ? formatPrice(globalPrice) : formatPrice(usdtPrice);

  const coinMarketCapUrl = getCoinMarketCapUrl(symbol);

  return (
    <Link
      href={coinMarketCapUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full"
    >
      <div className="flex items-center p-3 bg-white rounded-lg shadow-md min-h-[88px] w-full transition-shadow hover:shadow-lg">
        <CurrencyIcon symbol={symbol} className="w-8 h-8 ml-3 flex-shrink-0" />
        <div className="flex flex-col justify-between flex-grow min-w-0 h-full">
          <div className="flex justify-between items-center w-full">
            <h3 className="text-sm font-semibold truncate max-w-[60%]">{symbol}</h3>
            <p
              className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'} whitespace-nowrap`}
            >
              {isPositive ? '+' : ''}
              {change.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 truncate">${displayPrice}</p>
            <p className="text-xs text-gray-600 truncate">{formattedIrrPrice} تومان</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
