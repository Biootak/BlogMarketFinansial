import { SkeletonBase, TableSkeleton } from '@/components/Skeletons';

export default function ExchangeDetailLoading() {
  return (
    <div
      dir="rtl"
      className="route-frame"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}
      aria-busy="true"
    >
      {/* PageHeader skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
        <SkeletonBase className="h-3 w-24 rounded" />
        <SkeletonBase className="h-8 w-56 rounded-lg" />
        <SkeletonBase className="h-4 w-80 rounded-md" />
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--ds-space-3)' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBase key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* Details */}
      <SkeletonBase className="h-48 rounded-xl" />

      {/* Table */}
      <TableSkeleton rows={5} showHeader showActions />
    </div>
  );
}