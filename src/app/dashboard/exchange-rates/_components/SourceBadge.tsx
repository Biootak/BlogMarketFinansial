// src/app/dashboard/exchange-rates/_components/SourceBadge.tsx
// 2026-06-20: بج منبع با رنگ متمایز (auto=emerald, manual=amber)

import type { MarketRateProvider } from '@/lib/market-rates';

interface SourceBadgeProps {
  provider: MarketRateProvider | string;
  tgjuKey?: string | null;
}

export default function SourceBadge({ provider, tgjuKey }: SourceBadgeProps) {
  if (provider === 'auto') {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-semibold"
        style={{
          fontSize: 'var(--ds-text-xs)',
          padding: '0.25rem 0.625rem',
          borderRadius: 'var(--ds-radius-full)',
          background: 'color-mix(in oklch, var(--ds-accent-emerald) 14%, transparent)',
          color: 'var(--ds-accent-emerald)',
          border: '1px solid color-mix(in oklch, var(--ds-accent-emerald) 30%, transparent)',
        }}
        aria-label={`منبع خودکار از ${tgjuKey ?? 'TGJU'}`}
      >
        <span
          aria-hidden
          style={{
            width: '0.375rem',
            height: '0.375rem',
            borderRadius: 'var(--ds-radius-full)',
            background: 'var(--ds-accent-emerald)',
            boxShadow: '0 0 0 3px color-mix(in oklch, var(--ds-accent-emerald) 18%, transparent)',
          }}
        />
        TGJU
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 font-semibold"
      style={{
        fontSize: 'var(--ds-text-xs)',
        padding: '0.25rem 0.625rem',
        borderRadius: 'var(--ds-radius-full)',
        background: 'color-mix(in oklch, var(--ds-accent-amber) 14%, transparent)',
        color: 'var(--ds-accent-amber)',
        border: '1px solid color-mix(in oklch, var(--ds-accent-amber) 30%, transparent)',
      }}
      aria-label="منبع دستی"
    >
      <span
        aria-hidden
        style={{
          width: '0.375rem',
          height: '0.375rem',
          borderRadius: 'var(--ds-radius-full)',
          background: 'var(--ds-accent-amber)',
        }}
      />
      دستی
    </span>
  );
}
