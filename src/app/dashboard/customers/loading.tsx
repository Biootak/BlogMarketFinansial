import { Skeleton } from '@/components/Dashboard/primitives/Skeleton';

export default function CustomersLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-5)',
        paddingBlockEnd: 'var(--ds-space-10)',
      }}
    >
      {/* PageHeader skeleton */}
      <div
        style={{
          padding: 'var(--ds-space-5) var(--ds-space-6)',
          background: 'var(--at-surface, var(--ds-surface))',
          border: '1px solid var(--at-line, var(--ds-border-default))',
          borderRadius: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 'var(--ds-space-4)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Skeleton variant="text" className="w-56 h-6" />
          <Skeleton variant="text" className="w-80 h-4" />
        </div>
        <Skeleton variant="text" className="w-28 h-9 rounded-md" />
      </div>

      {/* KPI strip skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--ds-space-3)',
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-[6.5rem]" />
        ))}
      </div>

      {/* Toolbar skeleton */}
      <Skeleton variant="row" className="h-12 rounded-xl" />

      {/* Table skeleton */}
      <div
        style={{
          background: 'var(--at-surface, var(--ds-surface))',
          border: '1px solid var(--at-line, var(--ds-border-default))',
          borderRadius: 'var(--ds-radius-xl)',
          padding: 'var(--ds-space-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ds-space-2)',
        }}
      >
        <Skeleton variant="row" className="h-10" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} variant="row" className="h-14" />
        ))}
      </div>
    </div>
  );
}
