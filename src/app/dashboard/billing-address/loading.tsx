import { SettingsCardSkeleton, SkeletonBase } from '@/components/Skeletons';

export default function BillingAddressLoading() {
  return (
    <div className="min-h-dvh p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="space-y-2">
        <SkeletonBase className="h-7 w-40 rounded-lg" />
        <SkeletonBase className="h-4 w-64 rounded-md" />
      </div>
      <SettingsCardSkeleton />
    </div>
  );
}
