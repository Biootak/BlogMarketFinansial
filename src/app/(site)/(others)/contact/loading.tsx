import { Skeleton } from '@/components/ui/skeleton';

/**
 * loading.tsx — /contact
 */
export default function ContactLoading() {
  return (
    <div
      dir="rtl"
      aria-busy="true"
      aria-label="در حال بارگذاری"
      style={{
        maxWidth: '40rem',
        margin: '0 auto',
        padding: 'var(--ds-space-8) var(--ds-space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-6)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
          <Skeleton className="h-4 w-28" />
          <Skeleton className={`h-${i === 3 ? '24' : '10'} w-full rounded-xl`} />
        </div>
      ))}
      <Skeleton className="h-11 w-32 rounded-xl" />
    </div>
  );
}
