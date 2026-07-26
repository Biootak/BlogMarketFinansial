/**
 * loading.tsx — Customer Portal skeleton
 * نمایش skeleton هنگام بارگذاری هر صفحه پورتال مشتری
 */
import { Skeleton } from '@/components/Dashboard/primitives';

export default function CustomerLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-6)',
        padding: 'var(--ds-space-5)',
      }}
    >
      {/* PageHeader skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
        <Skeleton variant="row" />
        <Skeleton variant="text" />
      </div>

      {/* Stats grid skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 'var(--ds-space-3)',
        }}
      >
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>

      {/* Content rows */}
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </div>
  );
}
