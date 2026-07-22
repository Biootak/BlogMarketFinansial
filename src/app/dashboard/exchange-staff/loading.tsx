import { Skeleton } from '@/components/Dashboard/primitives/Skeleton';

export default function ExchangeStaffLoading() {
  return (
    <div
      style={{
        padding: 'var(--ds-space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-3)',
      }}
    >
      <Skeleton variant="text" className="h-8 w-64" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--ds-space-3)',
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} variant="row" />
      ))}
    </div>
  );
}
