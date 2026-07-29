// src/app/dashboard/exchange-rates/_components/ExchangeRatesHeader.tsx
// 2026-07-29: 5-stat strip (total / active / auto / manual / coverage) —
// complements the LeadRateHero card on the same row.

import {
  HiOutlineCircleStack,
  HiOutlineSparkles,
  HiOutlineSquares2X2,
  HiOutlineWrenchScrewdriver,
} from 'react-icons/hi2';

interface HeaderProps {
  total: number;
  active: number;
  auto: number;
  manual: number;
  /** Total in registry — used to compute coverage. */
  registryTotal?: number;
  lastSyncAt: Date | null;
}

type Accent = 'brand' | 'emerald' | 'amber' | 'violet' | 'cyan';

function formatLastSync(lastSyncAt: Date | string | null): string {
  if (!lastSyncAt) return 'هنوز همگام‌سازی نشده';
  const d = lastSyncAt instanceof Date ? lastSyncAt : new Date(lastSyncAt);
  if (Number.isNaN(d.getTime())) return 'هنوز همگام‌سازی نشده';
  const diffMinutes = Math.round((Date.now() - d.getTime()) / 60_000);
  const rtf = new Intl.RelativeTimeFormat('fa-IR', { numeric: 'auto' });
  if (Math.abs(diffMinutes) < 1) return 'لحظاتی پیش';
  if (Math.abs(diffMinutes) < 60) return rtf.format(-diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(-diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(-diffDays, 'day');
}

const STAT_META: Array<{
  key: 'total' | 'active' | 'auto' | 'manual' | 'coverage';
  label: string;
  icon: typeof HiOutlineSquares2X2;
  accent: Accent;
}> = [
  { key: 'total', label: 'کل نرخ‌ها', icon: HiOutlineSquares2X2, accent: 'brand' },
  { key: 'active', label: 'فعال', icon: HiOutlineSparkles, accent: 'emerald' },
  { key: 'auto', label: 'خودکار (زنده)', icon: HiOutlineCircleStack, accent: 'cyan' },
  { key: 'manual', label: 'دستی', icon: HiOutlineWrenchScrewdriver, accent: 'amber' },
  { key: 'coverage', label: 'پوشش کاتالوگ', icon: HiOutlineSquares2X2, accent: 'violet' },
];

export default function ExchangeRatesHeader({
  total,
  active,
  auto,
  manual,
  registryTotal = 0,
  lastSyncAt,
}: HeaderProps) {
  const lastSyncLabel = formatLastSync(lastSyncAt);
  const coverage = registryTotal > 0 ? Math.round((total / registryTotal) * 100) : 0;

  const values: Record<string, string> = {
    total: total.toLocaleString('fa-IR'),
    active: active.toLocaleString('fa-IR'),
    auto: auto.toLocaleString('fa-IR'),
    manual: manual.toLocaleString('fa-IR'),
    coverage: `${coverage.toLocaleString('fa-IR')}٪`,
  };

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 11rem), 1fr))',
        gap: 'var(--ds-space-3)',
      }}
      role="list"
      aria-label="آمار کلی نرخ‌ها"
    >
      {STAT_META.map(({ key, label, icon: Icon, accent }) => (
        <StatCard
          key={key}
          role="listitem"
          label={label}
          value={values[key] ?? '۰'}
          accent={accent}
          icon={<Icon aria-hidden style={{ width: '0.95rem', height: '0.95rem' }} />}
          meta={key === 'auto' || key === 'manual' ? lastSyncLabel : undefined}
        />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon,
  meta,
  ...rest
}: {
  label: string;
  value: string;
  accent: Accent;
  icon: React.ReactNode;
  meta?: string;
  role?: string;
}) {
  const accentColor =
    accent === 'brand'
      ? 'var(--ds-brand-500)'
      : accent === 'emerald'
        ? 'var(--ds-accent-emerald)'
        : accent === 'amber'
          ? 'var(--ds-accent-amber)'
          : accent === 'violet'
            ? 'var(--ds-accent-violet)'
            : 'var(--ds-accent-cyan, var(--ds-brand-500))';
  const accentTint =
    accent === 'brand'
      ? 'color-mix(in oklch, var(--ds-brand-500) 12%, transparent)'
      : accent === 'emerald'
        ? 'color-mix(in oklch, var(--ds-accent-emerald) 12%, transparent)'
        : accent === 'amber'
          ? 'color-mix(in oklch, var(--ds-accent-amber) 14%, transparent)'
          : accent === 'violet'
            ? 'color-mix(in oklch, var(--ds-accent-violet) 12%, transparent)'
            : 'color-mix(in oklch, var(--ds-brand-500) 12%, transparent)';

  return (
    <div
      {...rest}
      className="ds-stat-card flex flex-col backdrop-blur-sm transition-shadow"
      style={{
        background: 'var(--ds-surface)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--ds-radius-md)',
        padding: 'var(--ds-space-3) var(--ds-space-4)',
        boxShadow: 'var(--ds-shadow-sm)',
        gap: '0.4rem',
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ gap: '0.4rem' }}
      >
        <span
          className="font-semibold uppercase"
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.08em',
            color: 'var(--ds-text-muted)',
          }}
        >
          {label}
        </span>
        <span
          aria-hidden
          className="inline-flex items-center justify-center"
          style={{
            width: '1.5rem',
            height: '1.5rem',
            borderRadius: 'var(--ds-radius-sm)',
            background: accentTint,
            color: accentColor,
          }}
        >
          {icon}
        </span>
      </div>
      <div
        className="font-extrabold tabular-nums"
        style={{
          fontSize: 'var(--ds-text-xl)',
          lineHeight: 1.1,
          color: accentColor,
          margin: 0,
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </div>
      {meta && (
        <div
          style={{
            fontSize: '0.65rem',
            color: 'var(--ds-text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {meta}
        </div>
      )}
    </div>
  );
}
