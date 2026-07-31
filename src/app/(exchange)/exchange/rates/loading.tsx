import { Skeleton } from '@/components/Dashboard/primitives/Skeleton';

export default function ExchangeRatesLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-6)',
      }}
    >
      {/* PageHeader skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
        <div style={{ width: 160, height: 12 }}>
          <Skeleton variant="row" className="w-full h-3" />
        </div>
        <div style={{ width: 240 }}>
          <Skeleton variant="row" className="h-7" />
        </div>
        <div style={{ width: 320 }}>
          <Skeleton variant="row" className="h-3" />
        </div>
      </div>

      {/* 2-col bento skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)',
          gap: 'var(--ds-space-5)',
          alignItems: 'start',
        }}
      >
        {/* Config column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-4)' }}>
          <div style={{ height: 120 }}>
            <Skeleton variant="card" className="h-full" />
          </div>
          <div style={{ height: 180 }}>
            <Skeleton variant="card" className="h-full" />
          </div>
          <div style={{ height: 120 }}>
            <Skeleton variant="card" className="h-full" />
          </div>
          <div style={{ height: 80 }}>
            <Skeleton variant="card" className="h-full" />
          </div>
        </div>

        {/* Preview column */}
        <div style={{ height: 420 }}>
          <Skeleton variant="card" className="h-full" />
        </div>
      </div>
    </div>
  );
}
