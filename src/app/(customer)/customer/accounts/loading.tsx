/**
 * loading.tsx — Accounts page skeleton
 */
import { Skeleton } from '@/components/Dashboard/primitives';

export default function AccountsLoading() {
  return (
    <div
      dir="rtl"
      aria-busy="true"
      aria-label="در حال بارگذاری حساب‌ها"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-6)',
        contain: 'layout paint style',
      }}
    >
      {/* PageHeader */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
        <Skeleton variant="row" />
        <Skeleton variant="text" className="!h-3 !w-1/3" />
      </div>

      {/* Accounts Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 'var(--ds-space-4)',
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{ blockSize: '8rem', borderRadius: 'var(--ds-radius-lg)', overflow: 'hidden' }}
          >
            <Skeleton variant="card" className="!h-full !rounded-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
