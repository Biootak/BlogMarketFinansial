/**
 * SettlementsLoading — skeleton that matches the new 2026 redesign layout:
 * PageHeader + 5-column KPI grid + frosted toolbar strip + table rows
 */
export default function SettlementsLoading() {
  return (
    <div className="route-frame" dir="rtl" aria-busy="true" aria-label="در حال بارگذاری…">
      {/* ── PageHeader skeleton ── */}
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
        aria-hidden="true"
      >
        <span
          className="animate-pulse"
          style={{
            display: 'block',
            height: '0.7rem',
            width: '6rem',
            borderRadius: '6px',
            background: 'var(--at-line)',
          }}
        />
        <span
          className="animate-pulse"
          style={{
            display: 'block',
            height: '1.5rem',
            width: '13rem',
            borderRadius: '6px',
            background: 'var(--at-line)',
          }}
        />
        <span
          className="animate-pulse"
          style={{
            display: 'block',
            height: '0.75rem',
            width: '9rem',
            borderRadius: '6px',
            background: 'var(--at-line)',
          }}
        />
      </div>

      {/* ── KPI strip skeleton — 5 cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 'var(--ds-space-3)',
          marginBottom: 'var(--ds-space-5)',
        }}
        aria-hidden="true"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              height: '5rem',
              borderRadius: 'var(--ds-radius-xl)',
              background: 'var(--at-line)',
              animationDelay: `${i * 60}ms`,
            }}
          />
        ))}
      </div>

      {/* ── Table skeleton ── */}
      <div
        style={{
          background: 'var(--at-surface)',
          border: '1px solid var(--at-line)',
          borderRadius: 'var(--ds-radius-xl)',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              height: '3.25rem',
              borderBottom: i < 5 ? '1px solid var(--at-line)' : undefined,
              background:
                i === 0
                  ? 'var(--at-line)'
                  : i % 2 === 0
                    ? 'var(--at-surface)'
                    : 'var(--at-surface-hover, var(--ds-canvas-subtle))',
              animationDelay: `${i * 40}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

