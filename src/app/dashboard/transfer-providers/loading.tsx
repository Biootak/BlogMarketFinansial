import { SkeletonBase, TableSkeleton } from '@/components/Skeletons';

export default function TransferProvidersLoading() {
  return (
    <main
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'var(--ds-space-6) var(--ds-space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-6)',
      }}
      aria-busy="true"
      aria-label="در حال بارگذاری ارائه‌دهندگان انتقال"
    >
      {/* Page header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
        <SkeletonBase className="h-3 w-20 rounded" />
        <SkeletonBase className="h-8 w-48 rounded-lg" />
        <SkeletonBase className="h-4 w-80 rounded-md" />
      </div>

      {/* Provider logo strip */}
      <div style={{ display: 'flex', gap: 'var(--ds-space-3)' }}>
        {(['p1', 'p2', 'p3'] as const).map((k) => (
          <SkeletonBase
            key={k}
            style={{
              width: '120px',
              height: '80px',
              borderRadius: 'var(--ds-radius-lg)',
            }}
          />
        ))}
      </div>

      {/* Table */}
      <TableSkeleton rows={6} showHeader showActions />
    </main>
  );
}
