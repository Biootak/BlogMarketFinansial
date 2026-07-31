import { Skeleton } from '@/components/ui/skeleton';

export default function NewAnnouncementLoading() {
  return (
    <div
      dir="rtl"
      aria-busy="true"
      aria-label="در حال بارگذاری فرم اعلان جدید"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)', padding: 'var(--ds-space-6) 0' }}
    >
      <Skeleton className="h-12 w-80 rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-12 w-48 rounded-xl" />
    </div>
  );
}
