import { Skeleton } from '@/components/ui/skeleton';

/**
 * loading.tsx — /exchanges
 * Mirrors the exchange listing layout (hero + grid cards).
 */
export default function ExchangesLoading() {
  return (
    <div dir="rtl" aria-busy="true" aria-label="در حال بارگذاری صرافی‌ها">
      {/* Hero */}
      <div
        style={{
          padding: 'var(--ds-space-10) var(--ds-space-4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--ds-space-4)',
        }}
      >
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-5 w-96 max-w-full" />
        <div
          style={{
            display: 'flex',
            gap: 'var(--ds-space-3)',
            marginBlockStart: 'var(--ds-space-2)',
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
      </div>
      {/* Grid */}
      <div className="container" style={{ paddingBlockEnd: 'var(--ds-space-10)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 'var(--ds-space-5)',
          }}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" style={{ opacity: 1 - i * 0.08 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
