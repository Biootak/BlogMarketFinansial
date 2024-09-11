import type React from 'react';
import type { ExchangeRate } from '@/types/types';
import CurrencyIcon from './CurrencyIcon';

interface ExchangeRateCardProps {
  rate: ExchangeRate;
}

export const ExchangeRateCard: React.FC<ExchangeRateCardProps> = ({ rate }) => {
  const { symbol, rate: value, irrPrice, change } = rate;
  const isPositive = change >= 0;

  const formattedIrrPrice = Math.floor(irrPrice / 10).toLocaleString('fa-IR');

  return (
    <div className="flex flex-col justify-between p-3 bg-white rounded-lg shadow-md aspect-[4/2] max-w-[200px]">
      <div className="flex items-center">
        <CurrencyIcon symbol={symbol} className="w-6 h-6 ml-2 flex-shrink-0" />
        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold truncate">{symbol}</h3>
            <p
              className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'} whitespace-nowrap`}
            >
              {isPositive ? '+' : ''}
              {change.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>
      <div className="mt-auto">
        <p className="text-xs text-gray-600 truncate">${value.toFixed(2)}</p>
        <p className="text-xs text-gray-600 truncate">{formattedIrrPrice} تومان</p>
      </div>
    </div>
  );
};

export default ExchangeRateCard;
