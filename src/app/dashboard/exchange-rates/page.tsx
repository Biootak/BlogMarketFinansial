// src/app/dashboard/exchange-rates/page.tsx
// 2026-07-29: merged workspace — ExchangeRate registry + RateList ticker lists
// Hero (LeadRateHero) + Stat strip + tabs (market / lists).

import { getExchangeRateList } from '@/actions/market-rates';
import { getRateLists } from '@/actions/rate-lists';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { MarketRateProvider, MarketRateUnit } from '@/lib/market-rates';
import { SYMBOL_REGISTRY } from '@/lib/market-rates/registry';
import { Suspense } from 'react';
import type { RateRowData } from './_components/ExchangeRateRow';
import ExchangeRatesHeader from './_components/ExchangeRatesHeader';
import ExchangeRatesShell from './_components/ExchangeRatesShell';

export const dynamic = 'force-dynamic';

export default async function ExchangeRatesPage() {
  const [rows, lists] = await Promise.all([getExchangeRateList(), getRateLists()]);

  const total = rows.length;
  const active = rows.filter((r) => r.active).length;
  const auto = rows.filter((r) => r.provider === 'auto').length;
  const manual = rows.filter((r) => r.provider === 'manual').length;
  const lastSyncAt = rows.reduce<Date | null>((max, r) => {
    const d = r.updatedAt instanceof Date ? r.updatedAt : new Date(r.updatedAt);
    if (Number.isNaN(d.getTime())) return max;
    return max === null || d > max ? d : max;
  }, null);

  const tableRows: RateRowData[] = rows.map((r) => ({
    id: r.id,
    symbol: r.symbol ?? r.currency,
    displayNameFa: r.displayNameFa ?? r.name,
    group: r.group ?? null,
    unit: (r.unit as MarketRateUnit | null) ?? null,
    divisor: r.divisor ?? 1,
    decimals: r.decimals ?? 0,
    singleRate: r.singleRate ?? null,
    provider: r.provider as MarketRateProvider,
    active: r.active,
    priority: r.priority ?? 99,
    tgjuKey: r.tgjuKey ?? null,
    updatedAt: r.updatedAt,
  }));

  return (
    <main
      className="mx-auto flex flex-col"
      style={{
        maxWidth: '1200px',
        padding: 'var(--ds-space-6) var(--ds-space-5)',
        gap: 'var(--ds-space-7)',
      }}
    >
      <PageHeader
        variant="compact"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'نرخ ارزها' }]}
        title="نرخ ارزها"
        description="مرکز فرمان نرخ‌های بازار، کاتالوگ ارز، و فهرست‌های سفارشی تیکر. همه چیز یک‌جا."
      />

      <ExchangeRatesHeader
        total={total}
        active={active}
        auto={auto}
        manual={manual}
        registryTotal={SYMBOL_REGISTRY.length}
        lastSyncAt={lastSyncAt}
      />

      <Suspense fallback={null}>
        <ExchangeRatesShell initialRows={tableRows} initialLists={lists} />
      </Suspense>
    </main>
  );
}
