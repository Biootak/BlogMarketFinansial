import { Skeleton } from '@/components/ui/skeleton';

/**
 * loading.tsx — /apply-exchange
 * Mirrors the form layout for near-zero CLS.
 */
export default function ApplyExchangeLoading() {
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
      {/* heading */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
      {/* form fields */}
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
      {/* submit */}
      <Skeleton className="h-11 w-36 rounded-xl" />
    </div>
  );
}
