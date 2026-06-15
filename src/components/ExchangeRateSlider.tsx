'use client';

import type React from 'react';
import type { ExchangeRate } from '@/types/types';
import { ExchangeRateCard } from './ExchangeRateCard';
import InfiniteTicker from './InfiniteTicker';

interface ExchangeRateSliderProps {
  rates: ExchangeRate[];
}

const ExchangeRateSlider: React.FC<ExchangeRateSliderProps> = ({ rates }) => {
  return (
    <div className="nc-ExchangeRateSlider relative marquee-pause">
      <InfiniteTicker duration={50} dir="rtl">
        <div className="flex items-center gap-2 px-2 py-1">
          {rates.map((rate, idx) => (
            <div
              key={`${rate.symbol}-${idx}`}
              className="shrink-0 w-auto"
            >
              <ExchangeRateCard rate={rate} />
            </div>
          ))}
        </div>
      </InfiniteTicker>
    </div>
  );
};

export default ExchangeRateSlider;
