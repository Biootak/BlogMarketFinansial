/**
 * ExchangePageSkeleton — shared skeleton for /exchange/* routes.
 * Mirrors the actual workspace layout (header + stats + table) for near-zero CLS.
 * Server Component — no client JS, no motion outside global reduced-motion clamp.
 */

import { Skeleton } from '@/components/ui/skeleton';

interface ExchangePageSkeletonProps {
  /** تعداد stat card ها — پیش‌فرض ۳ */
  statCount?: number;
  /** تعداد ردیف‌های جدول — پیش‌فرض ۶ */
  tableRows?: number;
}

export default function ExchangePageSkeleton({
  statCount = 3,
  tableRows = 6,
}: ExchangePageSkeletonProps) {
  return (
    <div className="nova-content-area" dir="rtl" aria-busy="true" aria-label="در حال بارگذاری">
      <div className="nova-page-shell">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBlockEnd: 'var(--ds-space-6)',
            gap: 'var(--ds-space-4)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>

        {/* ── Stat cards ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${statCount}, minmax(0, 1fr))`,
            gap: 'var(--ds-space-4)',
            marginBlockEnd: 'var(--ds-space-6)',
          }}
        >
          {Array.from({ length: statCount }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>

        {/* ── Toolbar ────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--ds-space-3)',
            marginBlockEnd: 'var(--ds-space-4)',
          }}
        >
          <Skeleton className="h-9 flex-1 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>

        {/* ── Table ──────────────────────────────────────────────── */}
        <div className="dash-panel" style={{ overflow: 'hidden' }}>
          {/* header row */}
          <Skeleton className="h-11 rounded-none" style={{ borderRadius: 0 }} />
          {/* body rows */}
          {Array.from({ length: tableRows }, (_, i) => (
            <Skeleton
              key={i}
              className="h-14 rounded-none"
              style={{ opacity: 1 - i * 0.1, borderRadius: 0 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
