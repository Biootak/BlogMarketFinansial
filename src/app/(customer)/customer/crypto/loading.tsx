/**
 * loading.tsx — Crypto page skeleton
 * منعکس‌کننده CryptoAssetsPanel: portfolio ribbon + wallet cards + market rates
 */
import { Skeleton } from '@/components/Dashboard/primitives';

export default function CryptoLoading() {
  return (
    <div
      dir="rtl"
      aria-busy="true"
      aria-label="در حال بارگذاری ارزهای دیجیتال"
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

      {/* Portfolio Ribbon */}
      <div style={{ blockSize: '6rem', borderRadius: 'var(--ds-radius-lg)', overflow: 'hidden' }}>
        <Skeleton variant="card" className="!h-full !rounded-none" />
      </div>

      {/* Wallet Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 'var(--ds-space-3)',
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{ blockSize: '9rem', borderRadius: 'var(--ds-radius-lg)', overflow: 'hidden' }}
          >
            <Skeleton variant="card" className="!h-full !rounded-none" />
          </div>
        ))}
      </div>

      {/* Market Rates */}
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
        <Skeleton variant="row" className="!h-5 !w-1/4 !rounded-md" />
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--ds-space-3)',
              paddingBlock: '0.4em',
            }}
          >
            <Skeleton variant="text" className="!h-3 !w-12" />
            <div style={{ flex: 1 }} />
            <Skeleton variant="text" className="!h-3 !w-20" />
            <Skeleton variant="text" className="!h-3 !w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
