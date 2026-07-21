import { SkeletonBase, StatsCardSkeleton, TableSkeleton } from '@/components/Skeletons';

export default function ExchangesLoading() {
  return (
    <main
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: 'var(--ds-space-6) var(--ds-space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-6)',
      }}
      aria-busy="true"
      aria-label="در حال بارگذاری تبادل‌ها"
    >
      {/* Page header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
        <SkeletonBase className="h-3 w-16 rounded" />
        <SkeletonBase className="h-8 w-40 rounded-lg" />
        <SkeletonBase className="h-4 w-72 rounded-md" />
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 'var(--ds-space-4)',
        }}
      >
        {(['a', 'b', 'c', 'd'] as const).map((k) => (
          <StatsCardSkeleton key={k} />
        ))}
      </div>

      {/* Table */}
      <TableSkeleton rows={8} showHeader showActions />
    </main>
  );
}
