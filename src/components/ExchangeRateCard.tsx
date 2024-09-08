import type React from 'react';
import { formatNumber } from '@/lib/utils';
import type { ExchangeRate } from '@/types/types';
import CurrencyIcon from './CurrencyIcon';

interface ExchangeRateCardProps {
  rate: ExchangeRate;
  index?: string;
}

export const ExchangeRateCard: React.FC<ExchangeRateCardProps> = ({ rate, index }) => {
  const { symbol, rate: value, change } = rate;
  const isPositive = change >= 0;

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md relative">
      {index && (
        <span className="absolute top-2 left-2 bg-primary-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
          {index}
        </span>
      )}
      <CurrencyIcon symbol={symbol} className="w-12 h-12 mb-2" />
      <h3 className="text-lg font-semibold">{symbol}</h3>
      <p className="text-sm text-gray-600">
        {formatNumber(Math.round(value))} تومان
      </p>
      <p className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {isPositive ? '+' : ''}
        {change.toFixed(2)}%
      </p>
    </div>
  );
};