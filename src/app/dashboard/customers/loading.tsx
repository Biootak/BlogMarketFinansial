import { Skeleton } from '@/components/Dashboard/primitives/Skeleton';

export default function CustomersLoading() {
  return (
    <div style={{ padding: 'var(--ds-space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
      <Skeleton variant="text" className="h-8 w-64" />
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} variant="row" />
      ))}
    </div>
  );
}
