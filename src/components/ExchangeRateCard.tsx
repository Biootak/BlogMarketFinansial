'use client';

import type React from 'react';
import type { ExchangeRate } from '@/types/types';
import CurrencyIcon from './CurrencyIcon';

interface ExchangeRateCardProps {
  rate: ExchangeRate;
}

export const ExchangeRateCard: React.FC<ExchangeRateCardProps> = ({ rate }) => {
  const { symbol, usdtPrice, irrPrice, change } = rate;
  const isPositive = change >= 0;

  // تبدیل ریال به تومان و فرمت‌بندی با جداکننده هزارگان
  const formattedIrrPrice = Math.floor(irrPrice / 10).toLocaleString('fa-IR');
  const formattedUsdtPrice = usdtPrice.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

  return (
    <div className="flex items-center p-3 bg-white rounded-lg shadow-md min-h-[88px] w-full">
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
          <p className="text-xs text-gray-600 truncate">${formattedUsdtPrice}</p>
          <p className="text-xs text-gray-600 truncate">{formattedIrrPrice} تومان</p>
        </div>
      </div>
    </div>
  );
};

export default ExchangeRateCard;
