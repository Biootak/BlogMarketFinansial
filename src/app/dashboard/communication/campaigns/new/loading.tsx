import { Skeleton } from '@/components/ui/skeleton';

export default function NewCampaignLoading() {
  return (
    <div
      dir="rtl"
      aria-busy="true"
      aria-label="در حال بارگذاری فرم کمپین جدید"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-5)',
        padding: 'var(--ds-space-6) 0',
      }}
    >
      <Skeleton className="h-12 w-80 rounded-2xl" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ds-space-4)' }}>
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-12 w-48 rounded-xl" />
    </div>
  );
}
