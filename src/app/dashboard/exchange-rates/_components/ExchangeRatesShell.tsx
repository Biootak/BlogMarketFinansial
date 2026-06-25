'use client';

/**
 * ExchangeRatesShell — 2026 merged workspace container.
 *
 * Orchestrates two tabs:
 *   • market  → ExchangeRatesWorkspace (individual ExchangeRate registry)
 *   • lists   → RateListsWorkspace (custom RateList ticker lists)
 *
 * Active tab is persisted in URL (?tab=market|lists).
 */

import type { RateListData } from '@/types/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { RateRowData } from './ExchangeRateRow';
import ExchangeRatesTabs, { type ExchangeRatesTab } from './ExchangeRatesTabs';
import ExchangeRatesWorkspace from './ExchangeRatesWorkspace';
import RateListsWorkspace from './RateListsWorkspace';

interface Props {
  initialRows: RateRowData[];
  initialLists: RateListData[];
  marketStats: {
    total: number;
    auto: number;
    manual: number;
    lastSyncAt: Date | null;
  };
}

const TAB_PARAM = 'tab';
const DEFAULT_TAB: ExchangeRatesTab = 'market';
const VALID_TABS: ExchangeRatesTab[] = ['market', 'lists'];

function parseTab(value: string | null): ExchangeRatesTab {
  return VALID_TABS.includes(value as ExchangeRatesTab) ? (value as ExchangeRatesTab) : DEFAULT_TAB;
}

export default function ExchangeRatesShell({ initialRows, initialLists }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ExchangeRatesTab>(() =>
    parseTab(searchParams?.get(TAB_PARAM) ?? null),
  );

  useEffect(() => {
    const next = parseTab(searchParams?.get(TAB_PARAM) ?? null);
    setActiveTab(next);
  }, [searchParams]);

  const handleTabChange = (tab: ExchangeRatesTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (tab === DEFAULT_TAB) {
      params.delete(TAB_PARAM);
    } else {
      params.set(TAB_PARAM, tab);
    }
    const qs = params.toString();
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ''}`, {
      scroll: false,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <ExchangeRatesTabs activeTab={activeTab} onTabChange={handleTabChange} />

      <div
        id={'exchange-rates-tabpanel-market'}
        role="tabpanel"
        aria-labelledby="exchange-rates-tab-market"
        hidden={activeTab !== 'market'}
        className={activeTab === 'market' ? 'contents' : 'hidden'}
      >
        <ExchangeRatesWorkspace initialRows={initialRows} />
      </div>

      <div
        id={'exchange-rates-tabpanel-lists'}
        role="tabpanel"
        aria-labelledby="exchange-rates-tab-lists"
        hidden={activeTab !== 'lists'}
        className={activeTab === 'lists' ? 'contents' : 'hidden'}
      >
        <RateListsWorkspace initialLists={initialLists} />
      </div>
    </div>
  );
}
