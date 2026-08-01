/**
 * loading.tsx — Transfer page skeleton
 */
import { Skeleton } from '@/components/Dashboard/primitives';

export default function TransferLoading() {
  return (
    <div
      dir="rtl"
      aria-busy="true"
      aria-label="در حال بارگذاری عملیات مالی"
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
        <Skeleton variant="text" className="!h-3 !w-1/2" />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 'var(--ds-space-2)' }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="text" className="!h-9 !w-24 !rounded-lg" />
        ))}
      </div>

      {/* Form area */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ds-space-4)',
          background: 'var(--ds-surface)',
          border: '1px solid var(--ds-border-subtle)',
          borderRadius: 'var(--ds-radius-lg)',
          padding: 'var(--ds-space-6)',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}
          >
            <Skeleton variant="text" className="!h-3 !w-24" />
            <Skeleton variant="text" className="!h-10 !rounded-lg" />
          </div>
        ))}
        <Skeleton variant="text" className="!h-10 !w-full !rounded-lg !mt-2" />
      </div>
    </div>
  );
}
