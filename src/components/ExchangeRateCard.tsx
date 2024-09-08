import type React from 'react';
import type { ExchangeRate } from '@/types/types';
import CurrencyIcon from './CurrencyIcon';

interface ExchangeRateCardProps {
  rate: ExchangeRate;
}

export const ExchangeRateCard: React.FC<ExchangeRateCardProps> = ({ rate }) => {
  const { symbol, rate: value, change } = rate;
  const isPositive = change >= 0;

  // تبدیل ریال به تومان و فرمت‌بندی با جداکننده هزارگان
  const formattedRate = Math.floor(value / 10).toLocaleString('fa-IR');

  return (
    <div className="flex items-center p-3 bg-white rounded-lg shadow-md">
      <CurrencyIcon symbol={symbol} className="w-8 h-8 ml-3 flex-shrink-0" />
      <div className="flex-grow">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold">{symbol}</h3>
          <p className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}
            {change.toFixed(2)}%
          </p>
        </div>
        <p className="text-xs text-gray-600 mt-1">{formattedRate} تومان</p>
      </div>
    </div>
  );
};

export default ExchangeRateCard;
