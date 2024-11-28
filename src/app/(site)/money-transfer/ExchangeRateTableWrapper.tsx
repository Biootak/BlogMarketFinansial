'use client';

import { useState } from 'react';
import type { ExchangeRateData } from '@/types/types';
import { ExchangeRateTableView } from './ExchangeRateTableView';
import { ExchangeRateCard } from './ExchangeRateCard';
import { ViewToggle } from './ViewToggle';

export function ExchangeRateTableWrapper({ exchangeRates }: { exchangeRates: ExchangeRateData[] }) {
  const [view, setView] = useState<'card' | 'table'>('table');

  return (
    <div className="space-y-6">
      <ViewToggle view={view} setView={setView} />
      {view === 'table' ? (
        <ExchangeRateTableView exchangeRates={exchangeRates} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {exchangeRates.map((rate, index) => (
            <ExchangeRateCard key={rate.id} rate={rate} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
