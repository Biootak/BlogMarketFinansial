// src/app/dashboard/exchange-rates/_lib/unit-labels.ts
// 2026-07-29: English, formal unit labels for the dashboard.
// Site-facing copy in `lib/market-rates/format.ts` remains Persian (user-facing);
// the dashboard uses neutral English labels for the admin context.

import type { MarketRateUnit } from '@/lib/market-rates';

export const DASHBOARD_UNIT_LABELS: Record<MarketRateUnit, string> = {
  toman: 'Toman',
  rial: 'Rial',
  usd: 'US Dollar',
  eur: 'Euro',
  afn: 'Afghani',
  pound: 'Pound Sterling',
};

/** Currency code (ISO 4217-style) shown next to a unit. */
export const DASHBOARD_UNIT_CODES: Record<MarketRateUnit, string> = {
  toman: 'TMN',
  rial: 'IRR',
  usd: 'USD',
  eur: 'EUR',
  afn: 'AFN',
  pound: 'GBP',
};

/** Long formal descriptions for the editor drawer option list. */
export const DASHBOARD_UNIT_DESCRIPTIONS: Record<MarketRateUnit, string> = {
  toman: 'Toman (Rial ÷ 10) — used for Iranian rates',
  rial: 'Raw Iranian Rial',
  usd: 'United States Dollar',
  eur: 'Euro',
  afn: 'Afghan Afghani',
  pound: 'British Pound Sterling',
};

export function getDashboardUnitLabel(unit: string | null | undefined): string {
  if (!unit) return '—';
  return DASHBOARD_UNIT_LABELS[unit as MarketRateUnit] ?? unit;
}
