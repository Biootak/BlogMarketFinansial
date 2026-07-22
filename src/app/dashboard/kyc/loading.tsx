import { Skeleton } from '@/components/ui/skeleton';

export default function KycLoading() {
  return (
    <div className="at-page" dir="rtl">
      <div style={{ maxWidth: 560, padding: 'var(--ds-space-6) var(--ds-space-4)' }}>
        <Skeleton className="mb-4 h-[72px] w-full rounded-[14px]" />
        <Skeleton className="h-[440px] w-full rounded-[20px]" />
      </div>
    </div>
  );
}
