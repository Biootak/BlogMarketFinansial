// src/app/dashboard/exchange-rates/page.tsx
// 2026-06-20: بازطراحی کامل — Server fetch + Client workspace

import { cacheLife } from 'next/cache';
import { getExchangeRateList } from '@/actions/market-rates';
import { PageHeader } from '@/components/Dashboard/primitives';
import ExchangeRatesHeader from './_components/ExchangeRatesHeader';
import ExchangeRatesWorkspace from './_components/ExchangeRatesWorkspace';
import type { MarketRateProvider, MarketRateUnit } from '@/lib/market-rates';
import type { RateRowData } from './_components/ExchangeRateRow';


export default async function ExchangeRatesPage() {
  // 2026-06-24: replaced `export const revalidate = 30` with
  // `'use cache'` + `cacheLife('minutes')`. Note: the previous 30s
  // cadence was faster than the built-in `minutes` profile (60s) —
  // define a custom profile in next.config.ts `cacheLife` if exact
  // 30s timing matters.
  'use cache';
  cacheLife('minutes');
  const rows = await getExchangeRateList();

  const total = rows.length;
  const auto = rows.filter((r) => r.provider === 'auto').length;
  const manual = rows.filter((r) => r.provider === 'manual').length;
  // normalize: prisma Date ممکن است پس از unstable_cache و RSC serialize
  // به string تبدیل شده باشد. در سرور به Date برگردانیم تا Client/Header
  // همیشه نوع قابل اعتماد داشته باشد.
  const lastSyncAt = rows.reduce<Date | null>((max, r) => {
    const d = r.updatedAt instanceof Date ? r.updatedAt : new Date(r.updatedAt);
    if (Number.isNaN(d.getTime())) return max;
    return max === null || d > max ? d : max;
  }, null);

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
      <PageHeader
        breadcrumb={[
          { label: 'داشبورد', href: '/dashboard' },
          { label: 'نرخ ارزها' },
        ]}
        title="نرخ ارزها"
        description="مدیریت نرخ‌های ارز و فلزات گرانبها"
      />
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
