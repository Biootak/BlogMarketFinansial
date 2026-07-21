import { Skeleton } from '@/components/ui/skeleton';

/**
 * loading.tsx — /terms
 */
export default function TermsLoading() {
  return (
    <div
      dir="rtl"
      aria-busy="true"
      aria-label="در حال بارگذاری"
      style={{
        maxWidth: '48rem',
        margin: '0 auto',
        padding: 'var(--ds-space-10) var(--ds-space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-5)',
      }}
    >
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-4 w-64" />
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
