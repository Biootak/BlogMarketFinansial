/**
 * loading.tsx — Requests page skeleton
 */
import { Skeleton } from '@/components/Dashboard/primitives';

export default function RequestsLoading() {
  return (
    <div
      dir="rtl"
      aria-busy="true"
      aria-label="در حال بارگذاری درخواست‌ها"
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
        <Skeleton variant="text" className="!h-3 !w-2/3" />
      </div>

      {/* Stats strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 'var(--ds-space-3)',
        }}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{ blockSize: '5rem', borderRadius: 'var(--ds-radius-lg)', overflow: 'hidden' }}
          >
            <Skeleton variant="card" className="!h-full !rounded-none" />
          </div>
        ))}
      </div>

      {/* Request list */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ds-space-2)',
          background: 'var(--ds-surface)',
          border: '1px solid var(--ds-border-subtle)',
          borderRadius: 'var(--ds-radius-lg)',
          padding: 'var(--ds-space-4)',
        }}
      >
        <Skeleton variant="row" className="!h-6 !w-2/5 !rounded-md" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--ds-space-3)',
              paddingBlock: '0.6em',
            }}
          >
            <Skeleton variant="avatar" className="!size-8 !rounded-lg flex-shrink-0" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4em' }}>
              <Skeleton variant="text" className="!h-3 !w-1/2" />
              <Skeleton variant="text" className="!h-2.5 !w-1/3" />
            </div>
            <Skeleton variant="text" className="!h-5 !w-20 !rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
