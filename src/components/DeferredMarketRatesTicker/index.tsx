'use client';

import { Skeleton } from '@/components/ui/skeleton';
import type { MarketRateItem } from '@/lib/market-rates/types';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const MarketRatesTicker = dynamic(() => import('@/components/MarketRates/MarketRatesTicker'), {
  ssr: false,
  loading: () => <TickerSkeleton />,
});

function TickerSkeleton() {
  return (
    <Skeleton
      className="h-10 sm:h-11 w-full rounded-2xl"
      aria-label="در حال بارگذاری نرخ‌های زنده"
    />
  );
}

function isMarketRateItem(value: unknown): value is MarketRateItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<MarketRateItem>;
  return (
    typeof item.symbol === 'string' &&
    typeof item.displayNameFa === 'string' &&
    typeof item.value === 'number' &&
    typeof item.changePercent === 'number'
  );
}

export function DeferredMarketRatesTicker() {
  const [rates, setRates] = useState<MarketRateItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/market-rates', { cache: 'no-store' });
        if (!response.ok) return;
        const payload: unknown = await response.json();
        if (
          !payload ||
          typeof payload !== 'object' ||
          !('success' in payload) ||
          payload.success !== true ||
          !('data' in payload) ||
          !Array.isArray(payload.data)
        ) {
          return;
        }
        const nextRates = payload.data.filter(isMarketRateItem);
        if (!cancelled) setRates(nextRates);
      } catch {
        // عمداً بی‌صدا: اسکلت سرجای خودش می‌ماند تا layout ثابت بماند
      }
    };

    const idle = window.requestIdleCallback?.(() => {
      void load();
    });
    const timer = idle === undefined ? window.setTimeout(() => void load(), 1200) : undefined;

    return () => {
      cancelled = true;
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  // CLS (2026-08-23): ظرف با ارتفاع ثابت همیشه رندر می‌شود تا تعویض
  // اسکلت→تیکر (یا خالی‌بودن نرخ‌ها) هرگز ارتفاع هدر را تغییر ندهد.
  return (
    <div className="h-10 sm:h-11 w-full" data-market-ticker-slot>
      {rates === null ? (
        <TickerSkeleton />
      ) : rates.length === 0 ? null : (
        <MarketRatesTicker
          rates={rates}
          duration={75}
          maxItems={Math.min(rates.length, 18)}
          label="نرخ‌های زنده"
          showEmptyState={false}
        />
      )}
    </div>
  );
}

export default DeferredMarketRatesTicker;
