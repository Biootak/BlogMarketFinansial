// src/app/dashboard/exchange-rates/loading.tsx
// 2026-06-20: DS-aligned loading skeleton — هم‌شکل با layout اصلی

import { Skeleton } from '@/components/ui/skeleton';

export default function ExchangeRatesLoading() {
  return (
    <main
      className="mx-auto flex flex-col"
      style={{
        maxWidth: '1200px',
        padding: 'var(--ds-space-6) var(--ds-space-5)',
        gap: 'var(--ds-space-8)',
      }}
      aria-busy="true"
      aria-label="در حال بارگذاری نرخ‌ها"
    >
      {/* Header skeleton */}
      <div className="flex flex-col" style={{ gap: 'var(--ds-space-2)' }}>
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* StatCards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 'var(--ds-space-4)' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20" style={{ borderRadius: 'var(--ds-radius-lg)' }} />
        ))}
      </div>

      {/* Toolbar skeleton */}
      <Skeleton className="h-12" style={{ borderRadius: 'var(--ds-radius-md)' }} />

      {/* Table skeleton */}
      <Skeleton className="h-96" style={{ borderRadius: 'var(--ds-radius-lg)' }} />
    </main>
  );
}
