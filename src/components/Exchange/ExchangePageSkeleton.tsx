import { Skeleton } from '@/components/Dashboard/primitives/Skeleton';

interface Props {
  statCount?: number;
  tableRows?: number;
}

export default function ExchangePageSkeleton({ statCount = 3, tableRows = 6 }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-6, 1.5rem)',
        padding: 'var(--ds-space-6, 1.5rem)',
        width: '100%',
      }}
    >
      {statCount > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${statCount}, 1fr)`,
            gap: 'var(--ds-space-4, 1rem)',
          }}
        >
          {Array.from({ length: statCount }).map((_, i) => (
            <Skeleton key={`stat-${i}`} variant="card" />
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2, 0.5rem)' }}>
        <Skeleton variant="row" className="h-10" />
        {Array.from({ length: tableRows }).map((_, i) => (
          <Skeleton key={`row-${i}`} variant="row" />
        ))}
      </div>
    </div>
  );
}
