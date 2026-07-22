import { Skeleton } from '@/components/Dashboard/primitives/Skeleton';

export default function PermissionsLoading() {
  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-4)',
        paddingBlockEnd: 'var(--ds-space-10)',
      }}
    >
      {/* PageHeader skeleton */}
      <Skeleton variant="card" className="h-20" />

      {/* Role cards skeleton */}
      <div
        style={{
          background: 'var(--at-surface)',
          border: '1px solid var(--at-line)',
          borderRadius: 'var(--ds-radius-xl)',
          padding: 'var(--ds-space-4) var(--ds-space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ds-space-3)',
        }}
      >
        <Skeleton variant="text" className="w-36 h-4" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 'var(--ds-space-2-5)',
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-24" />
          ))}
        </div>
      </div>

      {/* Toolbar skeleton */}
      <div style={{ display: 'flex', gap: 'var(--ds-space-3)', alignItems: 'center' }}>
        <Skeleton variant="text" className="h-9 w-64" />
        <Skeleton variant="text" className="h-7 w-20 rounded-full" />
        <Skeleton variant="text" className="h-7 w-20 rounded-full" />
        <Skeleton variant="text" className="h-7 w-24 rounded-full" />
      </div>

      {/* Matrix skeleton */}
      <div
        style={{
          background: 'var(--at-surface)',
          border: '1px solid var(--at-line)',
          borderRadius: 'var(--ds-radius-xl)',
          overflow: 'hidden',
        }}
      >
        <Skeleton variant="row" className="h-10" />
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} variant="row" className="h-11" />
        ))}
      </div>
    </div>
  );
}
