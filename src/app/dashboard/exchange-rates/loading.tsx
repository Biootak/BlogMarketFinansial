// src/app/dashboard/exchange-rates/loading.tsx
// 2026-07-29: Skeleton matching the new layout — header + stat strip + catalog + table.

import { PageHeader } from '@/components/Dashboard/primitives';

export default function Loading() {
  return (
    <main
      className="mx-auto flex flex-col"
      style={{
        maxWidth: '1200px',
        padding: 'var(--ds-space-6) var(--ds-space-5)',
        gap: 'var(--ds-space-7)',
      }}
      aria-busy="true"
      aria-live="polite"
    >
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'نرخ ارزها' }]}
        title="نرخ ارزها"
        description="در حال بارگذاری…"
      />

      {/* Stat strip skeleton */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 11rem), 1fr))',
          gap: 'var(--ds-space-3)',
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: '5.5rem',
              background: 'var(--ds-canvas-subtle)',
              border: '1px solid var(--ds-border-subtle)',
              borderRadius: 'var(--ds-radius-md)',
            }}
            className="animate-pulse"
          />
        ))}
      </div>

      {/* Catalog skeleton */}
      <div
        style={{
          background: 'var(--ds-surface)',
          border: '1px solid var(--ds-border-subtle)',
          borderRadius: 'var(--ds-radius-lg)',
          padding: 'var(--ds-space-5)',
          minHeight: '14rem',
        }}
        className="animate-pulse"
      />

      {/* Toolbar skeleton */}
      <div
        style={{
          height: '3rem',
          background: 'var(--ds-canvas-subtle)',
          border: '1px solid var(--ds-border-subtle)',
          borderRadius: 'var(--ds-radius-md)',
        }}
        className="animate-pulse"
      />

      {/* Table skeleton */}
      <div
        style={{
          background: 'var(--ds-surface)',
          border: '1px solid var(--ds-border-subtle)',
          borderRadius: 'var(--ds-radius-lg)',
          padding: 'var(--ds-space-3)',
          minHeight: '24rem',
        }}
        className="animate-pulse"
      />
    </main>
  );
}
