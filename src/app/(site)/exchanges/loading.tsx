/**
 * loading.tsx — /exchanges
 * Mirrors the new "Trading Floor" hero with 2-col layout + sections while data is being fetched.
 */
export default function ExchangesLoading() {
  return (
    <div
      dir="rtl"
      aria-busy="true"
      aria-label="در حال بارگذاری صرافی‌ها"
      style={{
        minBlockSize: '100dvh',
        background: 'var(--ds-canvas)',
        fontFamily: 'var(--font-estedad), system-ui, sans-serif',
      }}
    >
      {/* Hero */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'oklch(11% 0.018 255)',
          padding: 'clamp(2.5rem, 6vw, 4rem) clamp(1rem, 5vw, 3rem) 0',
          color: 'oklch(96% 0.005 250)',
        }}
      >
        <div
          style={{
            maxInlineSize: 1100,
            marginInline: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-3)',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              blockSize: 32,
              inlineSize: 220,
              borderRadius: 999,
              background: 'oklch(20% 0.03 250 / 0.55)',
              animation: 'pulse 1.4s ease-in-out infinite',
            }}
          />
          <div
            style={{
              blockSize: 36,
              inlineSize: 480,
              maxInlineSize: '90%',
              borderRadius: 8,
              background: 'oklch(20% 0.03 250 / 0.55)',
              animation: 'pulse 1.4s ease-in-out infinite',
            }}
          />
          <div
            style={{
              blockSize: 16,
              inlineSize: 360,
              maxInlineSize: '90%',
              borderRadius: 4,
              background: 'oklch(18% 0.02 250 / 0.55)',
              animation: 'pulse 1.4s ease-in-out infinite',
            }}
          />

          {/* 2-col calcGrid skeleton (calc + ticker) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.2fr',
              gap: 'var(--ds-space-3)',
              inlineSize: '100%',
              maxInlineSize: 1100,
            }}
          >
            <div
              style={{
                blockSize: 220,
                borderRadius: 'var(--ds-radius-xl)',
                background: 'oklch(15% 0.018 250 / 0.4)',
                border: '1px solid oklch(35% 0.04 250 / 0.35)',
                animation: 'pulse 1.4s ease-in-out infinite',
              }}
            />
            <div
              style={{
                blockSize: 220,
                borderRadius: 'var(--ds-radius-xl)',
                background: 'oklch(15% 0.018 250 / 0.4)',
                border: '1px solid oklch(35% 0.04 250 / 0.35)',
                animation: 'pulse 1.4s ease-in-out infinite',
              }}
            />
          </div>

          {/* Stats row skeleton */}
          <div
            style={{
              blockSize: 56,
              inlineSize: '100%',
              maxInlineSize: 880,
              borderRadius: 'var(--ds-radius-lg)',
              background: 'oklch(15% 0.018 250 / 0.4)',
              border: '1px solid oklch(35% 0.04 250 / 0.35)',
              animation: 'pulse 1.4s ease-in-out infinite',
            }}
          />
        </div>
        {/* Tape skeleton */}
        <div
          style={{
            blockSize: 44,
            background: 'oklch(10% 0.012 250 / 0.65)',
            borderBlock: '1px solid oklch(35% 0.04 250 / 0.4)',
            marginBlockStart: 'var(--ds-space-2)',
            animation: 'pulse 1.4s ease-in-out infinite',
          }}
        />
      </div>

      {/* Section skeletons */}
      <div style={{ padding: 'clamp(2.5rem, 6vw, 4rem) clamp(1rem, 5vw, 3rem)' }}>
        <div
          style={{
            maxInlineSize: 1100,
            marginInline: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-3)',
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                blockSize: 200,
                borderRadius: 'var(--ds-radius-xl)',
                background: 'var(--ds-surface)',
                border: '1px solid var(--ds-border-default)',
                animation: 'pulse 1.4s ease-in-out infinite',
                opacity: 1 - i * 0.18,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
