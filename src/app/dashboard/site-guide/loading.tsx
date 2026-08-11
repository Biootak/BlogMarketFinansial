import { SkeletonBase } from '@/components/Skeletons';

export default function SiteGuideLoading() {
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
        <SkeletonBase className="h-8 w-48 rounded-lg" />
        <SkeletonBase className="h-4 w-64 rounded-md" />
      </div>

      {/* Guide content */}
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 'var(--ds-space-5)' }}>
        <SkeletonBase className="h-[500px] rounded-xl" />
        <SkeletonBase className="h-[500px] rounded-xl" />
      </div>
    </div>
  );
}