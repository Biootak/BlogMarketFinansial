'use client';

import type { ExchangeRate } from '@/types/types';
import type React from 'react';
import { ExchangeRateCard } from './ExchangeRateCard';
import MySlider from './MySlider';

interface ExchangeRateSliderProps {
  rates: ExchangeRate[];
  itemPerRow: 4 | 5;
}

const ExchangeRateSlider: React.FC<ExchangeRateSliderProps> = ({ rates, itemPerRow }) => {
  const renderCard = (rate: ExchangeRate) => {
    return <ExchangeRateCard key={rate.symbol} rate={rate} />;
  };

  return (
    <div className="nc-ExchangeRateSlider">
      <MySlider
        data={rates}
        renderItem={renderCard}
        itemPerRow={itemPerRow}
        autoSlideInterval={5000}
        arrowBtnClass="top-1/2 -translate-y-1/2"
      />
    </div>
  );
};

export default ExchangeRateSlider;
