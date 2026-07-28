import { Skeleton } from '@/components/ui/skeleton';

export default function ExchangeLoading() {
  return (
    <div className="nova-content-area" dir="rtl" aria-busy="true">
      <div className="nova-page-shell">
        {/* Header skeleton */}
        <div
          className="nova-section-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>

        {/* Stats row skeleton */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>

        {/* Table skeleton */}
        <div className="dash-panel" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <Skeleton className="h-12 rounded-none" style={{ borderRadius: 0 }} />
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                className="h-14 rounded-none"
                style={{ opacity: 1 - i * 0.12, borderRadius: 0 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
