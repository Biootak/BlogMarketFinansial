import { TableSkeleton, SkeletonBase } from '@/components/Skeletons';

export default function RateListsLoading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBase className="h-7 w-36 rounded-lg" />
          <SkeletonBase className="h-4 w-52 rounded-md" />
        </div>
        <SkeletonBase className="h-10 w-36 rounded-xl" />
      </div>
      <TableSkeleton rows={8} />
    </div>
  );
}
