import { Skeleton } from '@/components/ui/skeleton';

export default function TransferLoading() {
  return (
    <div className="at-page" dir="rtl" style={{ padding: 'var(--ds-space-6)' }}>
      <Skeleton className="mb-6 h-16 w-full rounded-[14px]" />
      <Skeleton className="h-[380px] w-full max-w-[520px] rounded-[20px]" />
    </div>
  );
}
