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
  const renderCard = (rate: ExchangeRate, index: number) => {
    const topIndex = index < 3 ? `#${index + 1}` : undefined;
    return <ExchangeRateCard key={rate.symbol} rate={rate} index={topIndex} />;
  };

  return <MySlider data={rates} renderItem={renderCard} itemPerRow={itemPerRow} />;
};

export default ExchangeRateSlider;
