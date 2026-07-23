import { Skeleton } from '@/components/Dashboard/primitives/Skeleton';

/**
 * NotificationsLoading — glass skeleton matching the new KPI + timeline design
 */
export default function NotificationsLoading() {
  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-5)',
        padding: 'var(--ds-space-5)',
        maxInlineSize: '1440px',
        marginInline: 'auto',
        paddingBlockEnd: 'var(--ds-space-10)',
      }}
    >
      {/* Page Header skeleton */}
      <div
        style={{
          padding: 'var(--ds-space-5)',
          background: 'var(--at-surface, oklch(100% 0 0))',
          border: '1px solid var(--at-line, oklch(93% 0.008 245))',
          borderRadius: 'var(--ds-radius-xl)',
          boxShadow: 'var(--at-shadow-sm)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--ds-space-4)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)', flex: 1 }}>
          <Skeleton variant="text" className="h-3 w-32" />
          <Skeleton variant="text" className="h-7 w-56" />
          <Skeleton variant="text" className="h-4 w-72" />
        </div>
        <div style={{ display: 'flex', gap: 'var(--ds-space-2)', flexShrink: 0 }}>
          <Skeleton variant="row" className="h-8 w-28" />
          <Skeleton variant="row" className="h-8 w-28" />
        </div>
      </div>

      {/* KPI Glass Strip skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--ds-space-3)',
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: 'var(--ds-space-4)',
              background: 'color-mix(in oklch, var(--at-surface, oklch(100% 0 0)) 92%, transparent)',
              backdropFilter: 'blur(12px) saturate(140%)',
              WebkitBackdropFilter: 'blur(12px) saturate(140%)',
              border: '1px solid var(--at-line, oklch(93% 0.008 245))',
              borderRadius: 'var(--ds-radius-xl)',
              boxShadow: 'var(--at-shadow-sm)',
              display: 'flex',
              flexDirection: 'column' as const,
              gap: 'var(--ds-space-2)',
              animationDelay: `${i * 60}ms`,
            }}
          >
            <Skeleton variant="avatar" className="h-8 w-8 rounded-lg" />
            <Skeleton variant="text" className="h-7 w-12" />
            <Skeleton variant="text" className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Toolbar skeleton */}
      <div
        style={{
          padding: '8px 12px',
          background: 'color-mix(in oklch, var(--at-surface, oklch(100% 0 0)) 88%, transparent)',
          backdropFilter: 'blur(16px) saturate(160%)',
          WebkitBackdropFilter: 'blur(16px) saturate(160%)',
          border: '1px solid var(--at-line, oklch(93% 0.008 245))',
          borderRadius: 'var(--ds-radius-xl)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--ds-space-3)',
        }}
      >
        <Skeleton variant="row" className="h-8 w-48" />
        <div style={{ flex: 1 }} />
        <Skeleton variant="row" className="h-8 w-28" />
      </div>

      {/* Notification list skeleton — two groups */}
      {[{ label: 'w-12', count: 3 }, { label: 'w-16', count: 2 }].map((group, gi) => (
        <div
          key={gi}
          style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
        >
          {/* Group label */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--ds-space-2)',
              paddingBlock: 'var(--ds-space-2)',
              paddingInline: 'var(--ds-space-4)',
            }}
          >
            <Skeleton variant="text" className={`h-3 ${group.label}`} />
            <div
              style={{
                flex: 1,
                blockSize: '1px',
                background: 'var(--at-line, oklch(93% 0.008 245))',
              }}
            />
          </div>

          {/* Card */}
          <div
            style={{
              background: 'color-mix(in oklch, var(--at-surface, oklch(100% 0 0)) 94%, transparent)',
              border: '1px solid var(--at-line, oklch(93% 0.008 245))',
              borderRadius: 'var(--ds-radius-xl)',
              overflow: 'hidden',
            }}
          >
            {Array.from({ length: group.count }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--ds-space-3)',
                  padding: 'var(--ds-space-4)',
                  borderBlockEnd:
                    i < group.count - 1
                      ? '1px solid var(--at-line, oklch(93% 0.008 245))'
                      : 'none',
                }}
              >
                <Skeleton variant="avatar" className="h-[38px] w-[38px] rounded-xl flex-shrink-0" />
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column' as const,
                    gap: 'var(--ds-space-2)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 'var(--ds-space-2)', alignItems: 'center' }}>
                    <Skeleton variant="text" className="h-4 w-16" />
                    <Skeleton variant="text" className="h-3 w-24" />
                  </div>
                  <Skeleton
                    variant="text"
                    lines={i % 2 === 0 ? 1 : 2}
                    className="h-4 w-full"
                  />
                </div>
                <Skeleton variant="text" className="h-3 w-16 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
