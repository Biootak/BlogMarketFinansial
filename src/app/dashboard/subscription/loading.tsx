import { GridSkeleton, SkeletonBase } from '@/components/Skeletons';

export default function SubscriptionLoading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="space-y-2">
        <SkeletonBase className="h-7 w-36 rounded-lg" />
        <SkeletonBase className="h-4 w-56 rounded-md" />
      </div>
      <GridSkeleton cols={3} count={3} itemClassName="h-64" />
    </div>
  );
}
