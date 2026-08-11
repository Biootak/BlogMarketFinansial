import { SkeletonBase } from '@/components/Skeletons';

export default function PostsCalendarLoading() {
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

      {/* Calendar grid */}
      <SkeletonBase className="h-[600px] rounded-xl" />
    </div>
  );
}