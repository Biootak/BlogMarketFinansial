import { Skeleton } from '@/components/Dashboard/primitives/Skeleton';

export default function NotificationsLoading() {
  return (
    <div
      style={{
        padding: 'var(--ds-space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-3)',
      }}
    >
      <Skeleton variant="text" className="h-8 w-48" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} variant="row" className="h-16" />
      ))}
    </div>
  );
}
