export default function WalletLoading() {
  return (
    <div className="route-frame" dir="rtl" aria-busy="true" aria-label="در حال بارگذاری کیف پول…">
      {/* Hero card skeleton */}
      <div
        className="animate-pulse"
        style={{
          height: '13rem',
          borderRadius: 'var(--ds-radius-2xl)',
          background: 'linear-gradient(135deg, var(--at-line) 0%, var(--at-surface-hover) 100%)',
          marginBottom: 'var(--ds-space-5)',
        }}
        aria-hidden="true"
      />

      {/* Quick actions skeleton */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--ds-space-3)',
          marginBottom: 'var(--ds-space-6)',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              flex: 1,
              height: '5rem',
              borderRadius: 'var(--ds-radius-lg)',
              background: 'var(--at-line)',
            }}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Transaction list skeleton */}
      <div
        style={{
          background: 'var(--at-surface)',
          border: '1px solid var(--at-line)',
          borderRadius: 'var(--at-radius-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="animate-pulse"
          style={{
            height: '3rem',
            background: 'var(--at-surface-hover)',
            borderBottom: '1px solid var(--at-line)',
          }}
          aria-hidden="true"
        />
        {/* Rows */}
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--ds-space-3)',
              padding: 'var(--ds-space-3) var(--ds-space-4)',
              borderBottom: i < 4 ? '1px solid var(--at-line)' : undefined,
            }}
          >
            <div
              className="animate-pulse"
              style={{
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: '50%',
                background: 'var(--at-line)',
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div
                className="animate-pulse"
                style={{
                  height: '0.875rem',
                  width: '60%',
                  borderRadius: '4px',
                  background: 'var(--at-line)',
                }}
                aria-hidden="true"
              />
              <div
                className="animate-pulse"
                style={{
                  height: '0.75rem',
                  width: '35%',
                  borderRadius: '4px',
                  background: 'var(--at-line)',
                }}
                aria-hidden="true"
              />
            </div>
            <div
              className="animate-pulse"
              style={{
                height: '0.875rem',
                width: '5rem',
                borderRadius: '4px',
                background: 'var(--at-line)',
              }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
