// src/app/dashboard/exchange-rates/_components/ValueCell.tsx
// 2026-06-20: نمایش مقدار DB + delta از TGJU در یک سلول
// RTL-safe (اعداد با dir="ltr" داخل سلول)

import type { MarketRateUnit } from '@/lib/market-rates';
import { formatWithUnit } from '@/lib/market-rates/format';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

interface ValueCellProps {
  rawValue: number | null;
  unit: MarketRateUnit | string | null;
  decimals: number;
  tgjuDelta?: number | null;
}

export default function ValueCell({ rawValue, unit, decimals, tgjuDelta }: ValueCellProps) {
  if (rawValue === null || !unit) {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-medium tabular-nums"
        style={{
          fontSize: 'var(--ds-text-sm)',
          color: 'var(--ds-text-muted)',
          opacity: 0.6,
        }}
        aria-label="مقدار موجود نیست"
      >
        <Minus aria-hidden style={{ width: '0.875rem', height: '0.875rem' }} />—
      </span>
    );
  }

  const formatted = formatWithUnit(rawValue, unit as MarketRateUnit, decimals);
  const hasDelta = typeof tgjuDelta === 'number' && Number.isFinite(tgjuDelta) && tgjuDelta !== 0;

  return (
    <span className="inline-flex items-center gap-2">
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
      {hasDelta && (
        <span
          className="inline-flex items-center gap-0.5 font-semibold tabular-nums"
          dir="ltr"
          style={{
            fontSize: 'var(--ds-text-xs)',
            color: (tgjuDelta ?? 0) > 0 ? 'var(--ds-accent-emerald)' : 'var(--ds-accent-rose)',
          }}
          aria-label={`تغییر ${(tgjuDelta ?? 0) > 0 ? 'مثبت' : 'منفی'} ${Math.abs(tgjuDelta ?? 0).toFixed(2)} درصد`}
        >
          {(tgjuDelta ?? 0) > 0 ? (
            <TrendingUp aria-hidden style={{ width: '0.75rem', height: '0.75rem' }} />
          ) : (
            <TrendingDown aria-hidden style={{ width: '0.75rem', height: '0.75rem' }} />
          )}
          {(tgjuDelta ?? 0) > 0 ? '+' : ''}
          {(tgjuDelta ?? 0).toFixed(2)}٪
        </span>
      )}
    </span>
  );
}
