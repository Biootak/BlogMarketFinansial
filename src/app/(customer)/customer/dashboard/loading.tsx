/**
 * loading.tsx — Customer Dashboard skeleton
 * ساختار منعکس‌کننده CustomerDashboardContent:
 *  1. PageHeader skeleton
 *  2. Balance Ribbon skeleton
 *  3. KPI strip (4 کارت)
 *  4. Account Ledger grid (3 کارت)
 *  5. Heatmap + Volume panel
 *  6. Transactions list (4 ردیف)
 */
import { Skeleton } from '@/components/Dashboard/primitives';

export default function CustomerDashboardLoading() {
  return (
    <div
      dir="rtl"
      aria-busy="true"
      aria-label="در حال بارگذاری داشبورد"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-6)',
        contain: 'layout',
      }}
    >
      {/* §1. PageHeader */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
        <Skeleton variant="row" />
        <Skeleton variant="text" className="!h-3 !w-2/3" />
      </div>

      {/* §2. Balance Ribbon */}
      <div
        style={{
          blockSize: '5rem',
          borderRadius: 'var(--ds-radius-lg)',
          overflow: 'hidden',
        }}
      >
        <Skeleton variant="card" className="!h-full !rounded-none" />
      </div>

      {/* §3. KPI Strip — 4 cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 'var(--ds-space-3)',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              blockSize: '6rem',
              borderRadius: 'var(--ds-radius-lg)',
              overflow: 'hidden',
            }}
          >
            <Skeleton variant="card" className="!h-full !rounded-none" />
          </div>
        ))}
      </div>

      {/* §4. Account Ledger Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 'var(--ds-space-3)',
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              blockSize: '7rem',
              borderRadius: 'var(--ds-radius-lg)',
              overflow: 'hidden',
            }}
          >
            <Skeleton variant="card" className="!h-full !rounded-none" />
          </div>
        ))}
      </div>

      {/* §5. Heatmap + Volume panels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
        <div
          style={{
            blockSize: '9rem',
            borderRadius: 'var(--ds-radius-lg)',
            overflow: 'hidden',
          }}
        >
          <Skeleton variant="card" className="!h-full !rounded-none" />
        </div>
        <div
          style={{
            blockSize: '7rem',
            borderRadius: 'var(--ds-radius-lg)',
            overflow: 'hidden',
          }}
        >
          <Skeleton variant="card" className="!h-full !rounded-none" />
        </div>
      </div>

      {/* §6. Transactions list */}
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
        {/* Header */}
        <Skeleton variant="row" className="!h-6 !w-2/5 !rounded-md" />
        {/* Rows */}
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--ds-space-3)',
              paddingBlock: '0.5em',
            }}
          >
            <Skeleton variant="avatar" className="!size-9 !rounded-lg flex-shrink-0" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4em' }}>
              <Skeleton variant="text" className="!h-3 !w-3/5" />
              <Skeleton variant="text" className="!h-2.5 !w-2/5" />
            </div>
            <Skeleton variant="text" className="!h-3 !w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
