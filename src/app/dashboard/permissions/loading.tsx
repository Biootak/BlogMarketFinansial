import { Skeleton } from '@/components/Dashboard/primitives/Skeleton';

export default function PermissionsLoading() {
  return (
    <div style={{ padding: 'var(--ds-space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
      <Skeleton variant="text" className="h-8 w-56" />
      <Skeleton variant="card" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} variant="row" />
      ))}
    </div>
  );
}
