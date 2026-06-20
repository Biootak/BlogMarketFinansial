// src/app/dashboard/exchange-rates/page.tsx
// 2026-06-20: server-side view (قبلا client-side با dialog سنگین بود).
// لیست + RateForm جدید (DiscoveryDropdown + createMarketRate).

import { getExchangeRateList } from '@/actions/market-rates';
import { formatWithUnit } from '@/lib/market-rates/format';
import type { MarketRateUnit } from '@/lib/market-rates';
import RateForm from './components/RateForm';

export const dynamic = 'force-dynamic';

export default async function ExchangeRatesPage() {
  const rows = await getExchangeRateList();

  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-2xl font-bold">مدیریت نرخ‌های بازار</h1>

      <RateForm />

      <div>
        <h2 className="text-xl font-bold mb-4">نرخ‌های فعلی</h2>
        <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-3 py-2 text-right">اولویت</th>
                <th className="px-3 py-2 text-right">نام</th>
                <th className="px-3 py-2 text-right">Symbol</th>
                <th className="px-3 py-2 text-right">گروه</th>
                <th className="px-3 py-2 text-right">واحد</th>
                <th className="px-3 py-2 text-right">مقدار</th>
                <th className="px-3 py-2 text-right">منبع</th>
                <th className="px-3 py-2 text-right">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const value = r.singleRate ? Number.parseFloat(r.singleRate) / (r.divisor || 1) : null;
                return (
                  <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-3 py-2">{r.priority}</td>
                    <td className="px-3 py-2 font-medium">{r.displayNameFa ?? r.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.symbol ?? r.currency}</td>
                    <td className="px-3 py-2">{r.group ?? '—'}</td>
                    <td className="px-3 py-2">{r.unit ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums" dir="ltr">
                      {value !== null && r.unit
                        ? formatWithUnit(value, r.unit as MarketRateUnit, r.decimals ?? 0)
                        : '—'}
                    </td>
                    <td className="px-3 py-2">{r.provider}</td>
                    <td className="px-3 py-2">{r.active ? '✓' : '✗'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
