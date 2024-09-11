'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ExchangeRateSlider from '@/components/ExchangeRateSlider';
import type { ExchangeRate } from '@/types/types';

export const SectionExchangeRates = () => {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [error, setError] = useState<string | null>(null);

  const updateRates = useCallback(async () => {
    try {
      const response = await fetch('/api/exchange-rates');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success && result.data) {
        setRates(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch exchange rates');
      }
    } catch (err) {
      console.error('Error fetching exchange rates:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  }, []);

  useEffect(() => {
    updateRates();
    const interval = setInterval(updateRates, 60000);
    return () => clearInterval(interval);
  }, [updateRates]);

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  return (
    <div className="nc-SectionExchangeRates pt-4">
      <ExchangeRateSlider rates={rates} itemPerRow={5} />
    </div>
  );
};

export default SectionExchangeRates;
