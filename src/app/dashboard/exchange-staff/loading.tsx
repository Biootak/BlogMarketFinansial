import { Skeleton } from '@/components/Dashboard/primitives/Skeleton';

export default function ExchangeStaffLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-5)',
        paddingBlockEnd: 'var(--ds-space-10)',
      }}
    >
      {/* PageHeader skeleton */}
      <div
        style={{
          padding: 'var(--ds-space-6)',
          background: 'var(--at-surface, var(--ds-surface))',
          border: '1px solid var(--at-line, var(--ds-border-default))',
          borderRadius: 'var(--ds-radius-xl, 1.25rem)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ds-space-3)',
        }}
      >
        <Skeleton variant="text" className="h-3 w-32" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-3)' }}>
          <Skeleton variant="card" className="h-10 w-10 rounded-xl flex-shrink-0" />
          <Skeleton variant="text" className="h-6 w-56" />
        </div>
        <Skeleton variant="text" className="h-3 w-80" />
      </div>

      {/* KPI strip skeleton — 4 horizontal cards */}
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
              background: 'var(--at-surface, var(--ds-surface))',
              border: '1px solid var(--at-line, var(--ds-border-default))',
              borderRadius: 'var(--ds-radius-xl, 1.25rem)',
              padding: 'var(--ds-space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--ds-space-3)',
            }}
          >
            <Skeleton variant="card" className="h-9 w-9 rounded-lg flex-shrink-0" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <Skeleton variant="text" className="h-7 w-10" />
              <Skeleton variant="text" className="h-2.5 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout: sidebar + main */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          gap: 'var(--ds-space-4)',
          alignItems: 'start',
        }}
      >
        {/* Sidebar skeleton */}
        <div
          style={{
            background: 'var(--at-surface, var(--ds-surface))',
            border: '1px solid var(--at-line, var(--ds-border-default))',
            borderRadius: 'var(--ds-radius-xl, 1.25rem)',
            padding: 'var(--ds-space-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-1)',
          }}
        >
          {/* Filter label + select */}
          <div
            style={{
              paddingBlock: 'var(--ds-space-2)',
              borderBlockEnd: '1px solid var(--at-line, var(--ds-border-default))',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ds-space-1-5)',
            }}
          >
            <Skeleton variant="text" className="h-2.5 w-16" />
            <Skeleton variant="card" className="h-8 w-full rounded-lg" />
          </div>
          {/* Role tabs */}
          <div
            style={{
              paddingBlock: 'var(--ds-space-2)',
              borderBlockEnd: '1px solid var(--at-line, var(--ds-border-default))',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <Skeleton variant="text" className="h-2.5 w-10 mb-1" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="text" className="h-8 w-full rounded-lg" />
            ))}
          </div>
          {/* Status chips */}
          <div
            style={{
              paddingBlock: 'var(--ds-space-2)',
              borderBlockEnd: '1px solid var(--at-line, var(--ds-border-default))',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <Skeleton variant="text" className="h-2.5 w-14 mb-1" />
            <Skeleton variant="text" className="h-7 w-full rounded-lg" />
            <Skeleton variant="text" className="h-7 w-full rounded-lg" />
          </div>
          {/* Invite button */}
          <div style={{ paddingBlock: 'var(--ds-space-2)' }}>
            <Skeleton variant="card" className="h-9 w-full rounded-lg" />
          </div>
        </div>

        {/* Main panel skeleton */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-3)',
          }}
        >
          {/* Search bar */}
          <div
            style={{
              background: 'var(--at-surface, var(--ds-surface))',
              border: '1px solid var(--at-line, var(--ds-border-default))',
              borderRadius: 'var(--ds-radius-xl, 1.25rem)',
              padding: 'var(--ds-space-2-5) var(--ds-space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--ds-space-3)',
            }}
          >
            <Skeleton variant="text" className="h-8 flex-1 rounded-lg" />
            <Skeleton variant="text" className="h-6 w-14 rounded-full" />
          </div>

          {/* Table */}
          <div
            style={{
              background: 'var(--at-surface, var(--ds-surface))',
              border: '1px solid var(--at-line, var(--ds-border-default))',
              borderRadius: 'var(--ds-radius-xl, 1.25rem)',
              overflow: 'hidden',
            }}
          >
            {/* Table header */}
            <div
              style={{
                padding: '10px var(--ds-space-4)',
                borderBlockEnd: '1px solid var(--at-line, var(--ds-border-default))',
                background:
                  'color-mix(in oklch, var(--at-bg-elevated, var(--ds-surface)) 82%, transparent)',
                display: 'flex',
                gap: 'var(--ds-space-8)',
              }}
            >
              {['w-28', 'w-20', 'w-14', 'w-16', 'w-14', 'w-20'].map((w, i) => (
                <Skeleton key={i} variant="text" className={`h-2.5 ${w}`} />
              ))}
            </div>
            {/* Rows */}
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                style={{
                  padding: 'var(--ds-space-3) var(--ds-space-4)',
                  borderBlockEnd:
                    i < 6 ? '1px solid var(--at-line, var(--ds-border-default))' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--ds-space-4)',
                }}
              >
                {/* Avatar + text */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--ds-space-3)',
                    flex: '1.8',
                  }}
                >
                  <Skeleton variant="avatar" className="flex-shrink-0" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Skeleton variant="text" className="h-3 w-24" />
                    <Skeleton variant="text" className="h-2.5 w-32" />
                  </div>
                </div>
                <Skeleton variant="text" className="h-3 w-20 flex-1" />
                <Skeleton variant="text" className="h-5 w-14 rounded-full" />
                <Skeleton variant="text" className="h-3 w-16" />
                <Skeleton variant="text" className="h-5 w-14 rounded-full" />
                <Skeleton variant="text" className="h-2.5 w-20" />
                <div
                  style={{ display: 'flex', gap: 'var(--ds-space-1)', marginInlineStart: 'auto' }}
                >
                  <Skeleton variant="card" className="h-7 w-7 rounded-lg" />
                  <Skeleton variant="card" className="h-7 w-7 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
