import React from 'react';
import { getExchangeRates } from '@/actions/getExchangeRates';
import ExchangeRateSlider from '../ExchangeRateSlider';

export const SectionExchangeRates = async () => {
  const result = await getExchangeRates();

  if (!result.success || !result.data) {
    return <div className="text-center text-red-500">{result.message}</div>;
  }

  return (
    <div className="nc-SectionExchangeRates">
      <ExchangeRateSlider rates={result.data} itemPerRow={5} />
    </div>
  );
};
