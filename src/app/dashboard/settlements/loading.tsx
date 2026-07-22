export default function SettlementsLoading() {
  return (
    <div className="at-page" dir="rtl" aria-busy="true" aria-label="در حال بارگذاری…">
      {/* PageHeader skeleton */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ds-space-2)',
          padding: 'var(--ds-space-4) var(--ds-space-5)',
          background: 'var(--at-surface)',
          border: '1px solid var(--at-line)',
          borderRadius: '14px',
          marginBottom: 'var(--ds-space-5)',
        }}
      >
        <span
          className="animate-pulse"
          style={{
            display: 'block',
            height: '1rem',
            width: '7rem',
            borderRadius: '6px',
            background: 'var(--at-line)',
          }}
          aria-hidden="true"
        />
        <span
          className="animate-pulse"
          style={{
            display: 'block',
            height: '1.5rem',
            width: '14rem',
            borderRadius: '6px',
            background: 'var(--at-line)',
          }}
          aria-hidden="true"
        />
      </div>

      {/* Stats skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--ds-space-3)',
          marginBottom: 'var(--ds-space-5)',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              height: '5.5rem',
              borderRadius: '12px',
              background: 'var(--at-line)',
            }}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Table skeleton */}
      <div
        style={{
          background: 'var(--at-surface)',
          border: '1px solid var(--at-line)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              height: '3.25rem',
              borderBottom: i < 4 ? '1px solid var(--at-line)' : undefined,
              background: i % 2 === 0 ? 'var(--at-surface)' : 'var(--at-surface-hover)',
              margin: '0 var(--ds-space-3)',
            }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
