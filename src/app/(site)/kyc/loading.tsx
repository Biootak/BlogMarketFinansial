import { Skeleton } from '@/components/ui/skeleton';

/**
 * loading.tsx — /kyc
 * Mirrors the KYC wizard multi-step layout.
 */
export default function KycLoading() {
  return (
    <div
      dir="rtl"
      aria-busy="true"
      aria-label="در حال بارگذاری"
      style={{
        maxWidth: '36rem',
        margin: '0 auto',
        padding: 'var(--ds-space-8) var(--ds-space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-6)',
      }}
    >
      {/* Step indicators */}
      <div style={{ display: 'flex', gap: 'var(--ds-space-3)', justifyContent: 'center' }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-2 w-16 rounded-full" />
        ))}
      </div>
      {/* Heading */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ds-space-2)',
          alignItems: 'center',
        }}
      >
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {/* Fields */}
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}
