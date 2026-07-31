import { Skeleton } from '@/components/Dashboard/primitives';

export default function RateListsLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-10 w-64 rounded-lg" />
      <Skeleton className="h-6 w-96 rounded-md" />
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  );
}
