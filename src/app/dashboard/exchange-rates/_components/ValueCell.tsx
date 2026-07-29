// src/app/dashboard/exchange-rates/_components/ValueCell.tsx
// 2026-07-29: Dashboard value cell — English formal unit labels,
// neutral "delta" terminology (no upstream source mentioned).

import type { MarketRateUnit } from '@/lib/market-rates';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { DASHBOARD_UNIT_CODES, DASHBOARD_UNIT_LABELS } from '../_lib/unit-labels';

interface ValueCellProps {
  rawValue: number | null;
  unit: MarketRateUnit | string | null;
  decimals: number;
  /** Optional percent delta vs. previous snapshot. */
  delta?: number | null;
}

function formatNumber(n: number, decimals: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export default function ValueCell({ rawValue, unit, decimals, delta }: ValueCellProps) {
  if (rawValue === null || !unit) {
    return (
      <span
        className="inline-flex items-center font-medium tabular-nums"
        style={{
          fontSize: 'var(--ds-text-sm)',
          color: 'var(--ds-text-muted)',
          opacity: 0.6,
          gap: '0.4rem',
        }}
        aria-label="بدون مقدار"
      >
        <Minus aria-hidden style={{ width: '0.875rem', height: '0.875rem' }} />—
      </span>
    );
  }

  const numericUnit = unit as MarketRateUnit;
  const unitLabel = DASHBOARD_UNIT_LABELS[numericUnit] ?? unit;
  const unitCode = DASHBOARD_UNIT_CODES[numericUnit];
  const formatted = formatNumber(rawValue, decimals);
  const hasDelta = typeof delta === 'number' && Number.isFinite(delta) && delta !== 0;

  return (
    <span className="inline-flex items-center" style={{ gap: '0.5rem' }}>
      <span
        className="font-semibold tabular-nums"
        dir="ltr"
        style={{
          fontSize: 'var(--ds-text-sm)',
          color: 'var(--ds-text-primary)',
        }}
      >
        {formatted}
      </span>
      <span
        className="font-semibold uppercase"
        dir="ltr"
        style={{
          fontSize: '0.65rem',
          letterSpacing: '0.05em',
          color: 'var(--ds-text-muted)',
        }}
      >
        {unitCode ?? unitLabel}
      </span>
      {hasDelta && (
        <span
          className="inline-flex items-center font-semibold tabular-nums"
          dir="ltr"
          style={{
            fontSize: 'var(--ds-text-xs)',
            color: (delta ?? 0) > 0 ? 'var(--ds-accent-emerald)' : 'var(--ds-accent-rose)',
            gap: '0.2rem',
          }}
          aria-label={`${(delta ?? 0) > 0 ? 'Positive' : 'Negative'} change ${Math.abs(delta ?? 0).toFixed(2)} percent`}
        >
          {(delta ?? 0) > 0 ? (
            <TrendingUp aria-hidden style={{ width: '0.75rem', height: '0.75rem' }} />
          ) : (
            <TrendingDown aria-hidden style={{ width: '0.75rem', height: '0.75rem' }} />
          )}
          {(delta ?? 0) > 0 ? '+' : ''}
          {(delta ?? 0).toFixed(2)}%
        </span>
      )}
    </span>
  );
}
