import { Skeleton } from '@/components/Dashboard/primitives';

export default function UserDetailLoading() {
  return (
    <div className="at-page flex flex-col gap-5" dir="rtl">
      {/* PageHeader skeleton */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-8 w-56 rounded-lg" />
        <Skeleton className="h-4 w-80 rounded-md" />
      </div>
      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      {/* Detail content */}
      <Skeleton className="h-[480px] w-full rounded-2xl" />
    </div>
  );
}
