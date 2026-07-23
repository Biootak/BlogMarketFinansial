import { Skeleton } from '@/components/ui/skeleton';

export default function DevicesLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-5)',
        padding: 'var(--ds-space-5)',
        paddingBlockEnd: 'var(--ds-space-10)',
      }}
      dir="rtl"
    >
      {/* PageHeader skeleton */}
      <Skeleton className="h-[110px] w-full rounded-[20px]" />

      {/* KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--ds-space-3)',
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[110px] w-full rounded-[20px]" />
        ))}
      </div>

      {/* Security Score Banner */}
      <Skeleton className="h-[74px] w-full rounded-[20px]" />

      {/* Toolbar */}
      <Skeleton className="h-[52px] w-full rounded-[20px]" />

      {/* Device Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'var(--ds-space-3)',
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[220px] w-full rounded-[20px]" />
        ))}
      </div>
    </div>
  );
}
