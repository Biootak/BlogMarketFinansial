'use client';

import { useState } from 'react';
import type { ExchangeRateData } from '@/types/types';
import { ExchangeRateTableView } from './ExchangeRateTableView';
import { ExchangeRateCard } from './ExchangeRateCard';
import { Button } from '@/components/ui/button';
import { Table2, Grid2X2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ExchangeRateTableWrapper({ exchangeRates }: { exchangeRates: ExchangeRateData[] }) {
  const [view, setView] = useState<'table' | 'card'>('table');

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-2">
        <Button
          variant={view === 'table' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('table')}
          className={cn(
            "gap-2 text-sm",
            view === 'table' ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-50 hover:text-blue-600'
          )}
        >
          <Table2 className="w-4 h-4" />
          <span>جدول</span>
        </Button>
        <Button
          variant={view === 'card' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('card')}
          className={cn(
            "gap-2 text-sm",
            view === 'card' ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-50 hover:text-blue-600'
          )}
        >
          <Grid2X2 className="w-4 h-4" />
          <span>کارت</span>
        </Button>
      </div>

      <div className="container">
        {view === 'table' ? (
          <ExchangeRateTableView exchangeRates={exchangeRates} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {exchangeRates.map((rate, index) => (
              <ExchangeRateCard key={rate.id} rate={rate} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
