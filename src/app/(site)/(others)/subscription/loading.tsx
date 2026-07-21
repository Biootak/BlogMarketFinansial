import { Skeleton } from '@/components/ui/skeleton';

/**
 * loading.tsx — /subscription
 */
export default function SubscriptionLoading() {
  return (
    <div dir="rtl" aria-busy="true" aria-label="در حال بارگذاری طرح‌های اشتراک">
      {/* Header */}
      <div
        style={{
          padding: 'var(--ds-space-10) var(--ds-space-4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--ds-space-4)',
        }}
      >
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="h-5 w-64" />
      </div>
      {/* Pricing grid */}
      <div
        style={{
          maxWidth: '60rem',
          margin: '0 auto',
          padding: '0 var(--ds-space-4) var(--ds-space-10)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 'var(--ds-space-5)',
        }}
      >
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-80 rounded-2xl" style={{ opacity: 1 - i * 0.06 }} />
        ))}
      </div>
    </div>
  );
}
