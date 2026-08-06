// 2026-08: بلوک `h-[110px]` جای سربرگ حدسی بود و با ارتفاع واقعی سربرگ
// `minimal` نمی‌خواند. PageHeaderSkeleton همان CSS سربرگ را مصرف می‌کند،
// پس دیگر layout shift نداریم.

import { PageHeaderSkeleton } from '@/components/Dashboard/primitives';
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
      aria-busy="true"
      aria-live="polite"
    >
      <PageHeaderSkeleton route="/dashboard/devices" />

      {/* KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), 1fr))',
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr))',
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
