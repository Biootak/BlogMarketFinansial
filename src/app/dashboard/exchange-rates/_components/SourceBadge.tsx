// src/app/dashboard/exchange-rates/_components/SourceBadge.tsx
// 2026-07-29: Source pill — neutral English labels, no upstream source mentioned.

import type { MarketRateProvider } from '@/lib/market-rates';

interface SourceBadgeProps {
  provider: MarketRateProvider | string;
}

export default function SourceBadge({ provider }: SourceBadgeProps) {
  if (provider === 'auto') {
    return (
      <span
        className="inline-flex items-center font-semibold"
        dir="ltr"
        style={{
          fontSize: 'var(--ds-text-xs)',
          padding: '0.25rem 0.625rem',
          borderRadius: 'var(--ds-radius-full)',
          background: 'color-mix(in oklch, var(--ds-accent-emerald) 14%, transparent)',
          color: 'var(--ds-accent-emerald)',
          border: '1px solid color-mix(in oklch, var(--ds-accent-emerald) 30%, transparent)',
          gap: '0.4rem',
        }}
        aria-label="خودکار"
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
        زنده
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center font-semibold"
      style={{
        fontSize: 'var(--ds-text-xs)',
        padding: '0.25rem 0.625rem',
        borderRadius: 'var(--ds-radius-full)',
        background: 'color-mix(in oklch, var(--ds-accent-amber) 14%, transparent)',
        color: 'var(--ds-accent-amber)',
        border: '1px solid color-mix(in oklch, var(--ds-accent-amber) 30%, transparent)',
        gap: '0.4rem',
      }}
      aria-label="دستی"
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
