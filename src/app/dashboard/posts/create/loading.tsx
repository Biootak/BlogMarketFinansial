import { SkeletonBase } from '@/components/Skeletons';

export default function PostCreateLoading() {
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

      {/* Form skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--ds-space-5)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-4)' }}>
          <SkeletonBase className="h-12 rounded-xl" />
          <SkeletonBase className="h-32 rounded-xl" />
          <SkeletonBase className="h-12 rounded-xl" />
          <SkeletonBase className="h-48 rounded-xl" />
        </div>
        <SkeletonBase className="h-[400px] rounded-xl" />
      </div>
    </div>
  );
}