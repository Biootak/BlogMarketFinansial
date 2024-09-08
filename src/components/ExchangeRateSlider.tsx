'use client';

import type React from 'react';
import type { ExchangeRate } from '@/types/types';
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
    <MySlider
      data={rates}
      renderItem={renderCard}
      itemPerRow={itemPerRow}
      autoSlideInterval={5000}
    />
  );
};

export default ExchangeRateSlider;
