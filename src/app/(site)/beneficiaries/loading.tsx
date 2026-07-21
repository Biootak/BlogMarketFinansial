import { Skeleton } from '@/components/ui/skeleton';

/**
 * loading.tsx — /beneficiaries
 */
export default function BeneficiariesLoading() {
  return (
    <div
      dir="rtl"
      aria-busy="true"
      aria-label="در حال بارگذاری"
      style={{
        maxWidth: '48rem',
        margin: '0 auto',
        padding: 'var(--ds-space-8) var(--ds-space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-6)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}
