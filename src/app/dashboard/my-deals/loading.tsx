import { Skeleton } from '@/components/ui/skeleton';

export default function MyDealsLoading() {
  return (
    <div className="route-frame" dir="rtl" style={{ padding: 'var(--ds-space-6)' }}>
      <Skeleton className="mb-5 h-[72px] w-full rounded-[14px]" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-[10px]" />
        ))}
      </div>
    </div>
  );
}
