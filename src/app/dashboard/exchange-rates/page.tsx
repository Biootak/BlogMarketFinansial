// src/app/dashboard/exchange-rates/page.tsx
// 2026-06-20: بازطراحی کامل — Server Component + Sub-Components
// فعلاً فقط Header؛ Toolbar و Table در Task 3 و 4 اضافه می‌شوند.

import { getExchangeRateList } from '@/actions/market-rates';
import ExchangeRatesHeader from './_components/ExchangeRatesHeader';

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
    </main>
  );
}
