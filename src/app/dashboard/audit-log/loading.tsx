import { Skeleton } from '@/components/Dashboard/primitives';

export default function AuditLogLoading() {
  return (
    <div className="route-frame" dir="rtl">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-4)' }}>
        {/* PageHeader skeleton */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            background: 'var(--at-surface)',
            border: '1px solid var(--at-line)',
            borderRadius: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '0.25rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Skeleton variant="text" className="w-20 h-3 rounded" />
            <Skeleton variant="text" className="w-40 h-7 rounded-md" />
            <Skeleton variant="text" className="w-56 h-4 rounded" />
          </div>
          <Skeleton variant="text" className="w-24 h-9 rounded-md" />
        </div>

        {/* KPI strip skeleton — 6 cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 'var(--ds-space-3)',
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`kpi-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: 'var(--at-surface)',
                border: '1px solid var(--at-line)',
                borderRadius: '1.25rem',
              }}
            >
              <Skeleton variant="text" className="w-8 h-8 rounded-lg flex-shrink-0" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <Skeleton variant="text" className="w-16 h-3 rounded" />
                <Skeleton variant="text" className="w-10 h-5 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar skeleton */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            background: 'var(--at-surface)',
            border: '1px solid var(--at-line)',
            borderRadius: '1.25rem',
          }}
        >
          <Skeleton variant="text" className="w-64 h-8 rounded-md" />
          <Skeleton variant="text" className="w-36 h-8 rounded-md" />
          <Skeleton variant="text" className="w-48 h-8 rounded-md" />
        </div>

        {/* Tabs skeleton */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '3px',
            background: 'var(--at-surface)',
            border: '1px solid var(--at-line)',
            borderRadius: '1.25rem',
            width: 'fit-content',
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={`tab-${i}`} variant="text" className="w-20 h-7 rounded-lg" />
          ))}
        </div>

        {/* Table skeleton */}
        <div
          style={{
            border: '1px solid var(--at-line)',
            borderRadius: '1.25rem',
            overflow: 'hidden',
            background: 'var(--at-surface)',
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr 1fr 1fr 100px 40px',
              gap: '1rem',
              padding: '0.625rem 1rem',
              borderBottom: '1px solid var(--at-line)',
              background: 'var(--at-surface)',
            }}
          >
            {['زمان', 'کنشگر', 'اقدام', 'موجودیت', 'IP', ''].map((h, i) => (
              <Skeleton key={i} variant="text" className={`h-3 rounded ${h ? 'w-12' : 'w-4'}`} />
            ))}
          </div>
          {/* Table rows */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={`row-${i}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr 1fr 1fr 100px 40px',
                gap: '1rem',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--at-line)',
                opacity: 1 - i * 0.06,
              }}
            >
              <Skeleton variant="text" className="h-8 rounded" />
              <Skeleton variant="text" className="h-8 rounded" />
              <Skeleton variant="text" className="h-6 w-28 rounded-full" />
              <Skeleton variant="text" className="h-5 w-20 rounded" />
              <Skeleton variant="text" className="h-4 w-20 rounded" />
              <Skeleton variant="text" className="h-5 w-5 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
