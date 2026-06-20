// src/app/dashboard/exchange-rates/page.tsx
// 2026-06-20: بازطراحی کامل — Server fetch + Client workspace

import { getExchangeRateList } from '@/actions/market-rates';
import ExchangeRatesHeader from './_components/ExchangeRatesHeader';
import ExchangeRatesWorkspace from './_components/ExchangeRatesWorkspace';
import type { MarketRateProvider, MarketRateUnit } from '@/lib/market-rates';
import type { RateRowData } from './_components/ExchangeRateRow';

export const revalidate = 30;

export default async function ExchangeRatesPage() {
  const rows = await getExchangeRateList();

  const total = rows.length;
  const auto = rows.filter((r) => r.provider === 'auto').length;
  const manual = rows.filter((r) => r.provider === 'manual').length;
  const lastSyncAt = rows.reduce<Date | null>(
    (max, r) => (max === null || r.updatedAt > max ? r.updatedAt : max),
    null,
  );

  // نگاشت به فرمت مورد نیاز Client Component
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
        gap: 'var(--ds-space-8)',
      }}
    >
      <ExchangeRatesHeader
        total={total}
        auto={auto}
        manual={manual}
        lastSyncAt={lastSyncAt}
      />
      <ExchangeRatesWorkspace initialRows={tableRows} />
    </main>
  );
}
