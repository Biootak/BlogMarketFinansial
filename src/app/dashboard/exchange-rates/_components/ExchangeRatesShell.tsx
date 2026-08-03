// src/app/dashboard/exchange-rates/_components/ExchangeRatesShell.tsx
// 2026-07-29: Tabs (market / lists). CurrencyCatalog is rendered by the
// Workspace itself, so this shell just hosts the tab switcher and the
// active tab content. URL ?tab=lists hydrates the initial tab.

'use client';

import type { MarketRateProvider, MarketRateUnit } from '@/lib/market-rates';
import type { RateListData } from '@/types/types';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { RateRowData } from './ExchangeRateRow';
import ExchangeRatesTabs from './ExchangeRatesTabs';
import ExchangeRatesWorkspace from './ExchangeRatesWorkspace';
import RateListsWorkspace from './RateListsWorkspace';

interface Props {
  initialRows: RateRowData[];
  initialLists: RateListData[];
}

type Tab = 'market' | 'lists';

export default function ExchangeRatesShell({ initialRows, initialLists }: Props) {
  const search = useSearchParams();
  const initialTab: Tab = search.get('tab') === 'lists' ? 'lists' : 'market';
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="flex flex-col" style={{ gap: 'var(--ds-space-4)' }}>
      <ExchangeRatesTabs
        value={tab}
        onChange={setTab}
        marketCount={initialRows.length}
        listsCount={initialLists.length}
      />

      {tab === 'market' ? (
        <ExchangeRatesWorkspace initialRows={initialRows} />
      ) : (
        <RateListsWorkspace initialLists={initialLists} />
      )}
    </div>
  );
}

// Re-export the row type to keep imports tidy.
export type { MarketRateProvider, MarketRateUnit };
