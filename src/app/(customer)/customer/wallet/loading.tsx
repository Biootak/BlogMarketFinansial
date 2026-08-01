/**
 * loading.tsx — Wallet page skeleton
 * منعکس‌کننده CustomerWalletContent: ribbon + accounts grid + txn list
 */
import { Skeleton } from '@/components/Dashboard/primitives';

export default function WalletLoading() {
  return (
    <div
      dir="rtl"
      aria-busy="true"
      aria-label="در حال بارگذاری کیف پول"
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

      {/* Balance Ribbon */}
      <div style={{ blockSize: '5rem', borderRadius: 'var(--ds-radius-lg)', overflow: 'hidden' }}>
        <Skeleton variant="card" className="!h-full !rounded-none" />
      </div>

      {/* Accounts Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 'var(--ds-space-3)',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{ blockSize: '7rem', borderRadius: 'var(--ds-radius-lg)', overflow: 'hidden' }}
          >
            <Skeleton variant="card" className="!h-full !rounded-none" />
          </div>
        ))}
      </div>

      {/* Transactions List */}
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
