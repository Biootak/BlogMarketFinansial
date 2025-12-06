'use client';

import type { ExchangeRate } from '@/types/types';
import type React from 'react';
import { ExchangeRateCard } from '../ExchangeRateCard';

interface ClientSideExchangeRateSliderProps {
  rates: ExchangeRate[];
}

const ClientSideExchangeRateSlider: React.FC<ClientSideExchangeRateSliderProps> = ({ rates }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {rates.map((rate) => (
        <ExchangeRateCard key={rate.symbol} rate={rate} />
      ))}
    </div>
  );
};

export default ClientSideExchangeRateSlider;
