import { Skeleton } from '@/components/ui/skeleton';

/**
 * loading.tsx — /track/[code]
 * Mirrors the TrackPage layout (hero + summary card + timeline).
 */
export default function TrackLoading() {
  return (
    <div dir="rtl" aria-busy="true" aria-label="در حال بارگذاری وضعیت معامله">
      {/* Hero */}
      <div
        style={{
          padding: 'var(--ds-space-10) var(--ds-space-4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--ds-space-4)',
          background: 'var(--ds-surface-raised)',
        }}
      >
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-7 w-36 rounded-xl" />
      </div>
      {/* Content */}
      <div
        style={{
          maxWidth: '36rem',
          margin: '0 auto',
          padding: 'var(--ds-space-6) var(--ds-space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ds-space-5)',
        }}
      >
        {/* Summary card */}
        <Skeleton className="h-32 w-full rounded-2xl" />
        {/* Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-4)' }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: 'var(--ds-space-3)', alignItems: 'center' }}
            >
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--ds-space-2)',
                }}
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
