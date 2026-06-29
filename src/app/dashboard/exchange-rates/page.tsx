// src/app/dashboard/exchange-rates/page.tsx
// 2026-06-25: merged workspace — ExchangeRate registry + RateList ticker lists

import { getExchangeRateList } from '@/actions/market-rates';
import { getRateLists } from '@/actions/rate-lists';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { MarketRateProvider, MarketRateUnit } from '@/lib/market-rates';
import type { RateRowData } from './_components/ExchangeRateRow';
import ExchangeRatesHeader from './_components/ExchangeRatesHeader';
import ExchangeRatesShell from './_components/ExchangeRatesShell';

// Dynamic rendering is inherited from the dashboard layout (force-dynamic);
// no per-page revalidate — this is an auth-gated workspace, not ISR content.
export default async function ExchangeRatesPage() {
  const [rows, lists] = await Promise.all([getExchangeRateList(), getRateLists()]);

  const total = rows.length;
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
        gap: 'var(--ds-space-8)',
      }}
    >
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'نرخ ارزها' }]}
        title="نرخ ارزها"
        description="مدیریت نرخ‌های بازار و لیست‌های سفارشی تیکر"
      />
      <ExchangeRatesHeader total={total} auto={auto} manual={manual} lastSyncAt={lastSyncAt} />
      <ExchangeRatesShell
        initialRows={tableRows}
        initialLists={lists}
        marketStats={{ total, auto, manual, lastSyncAt }}
      />
    </main>
  );
}
