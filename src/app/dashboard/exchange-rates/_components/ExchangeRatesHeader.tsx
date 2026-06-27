// src/app/dashboard/exchange-rates/_components/ExchangeRatesHeader.tsx
// 2026-06-20: بازطراحی — StatCards + عنوان با سلسله‌مراتب آشکار
// Server Component (بدون 'use client')

interface HeaderProps {
  total: number;
  auto: number;
  manual: number;
  lastSyncAt: Date | null;
}

type Accent = 'brand' | 'emerald' | 'amber';

function formatLastSync(lastSyncAt: Date | string | null): string {
  if (!lastSyncAt) return 'هنوز همگام‌سازی نشده';
  // defensive: ممکن است از RSC serialization به صورت string درآمده باشد
  const d = lastSyncAt instanceof Date ? lastSyncAt : new Date(lastSyncAt);
  if (Number.isNaN(d.getTime())) return 'هنوز همگام‌سازی نشده';
  const diffMinutes = Math.round((Date.now() - d.getTime()) / 60_000);
  const rtf = new Intl.RelativeTimeFormat('fa-IR', { numeric: 'auto' });
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, 'day');
}

export default function ExchangeRatesHeader({
  total,
  auto,
  manual,
  lastSyncAt,
}: HeaderProps) {
  const lastSyncLabel = formatLastSync(lastSyncAt);

  return (
    <header className="flex flex-col gap-[var(--ds-space-6)]">
      {/* Eyebrow + Title + Subhead */}
      <div className="flex flex-col gap-[var(--ds-space-2)]">
        <span
          className="font-semibold uppercase"
          style={{
            fontSize: 'var(--ds-text-xs)',
            letterSpacing: '0.08em',
            color: 'var(--ds-brand-500)',
          }}
        >
          بازارها
        </span>
        <h1
          className="font-extrabold tracking-tight"
          style={{
            fontSize: 'var(--ds-text-3xl)',
            lineHeight: 'var(--ds-leading-tight)',
            color: 'var(--ds-text-primary)',
            margin: 0,
          }}
        >
          نرخ‌های بازار
        </h1>
        <p
          className="max-w-2xl"
          style={{
            fontSize: 'var(--ds-text-base)',
            lineHeight: 'var(--ds-leading-relaxed)',
            color: 'var(--ds-text-secondary)',
            margin: 0,
          }}
        >
          مدیریت نرخ‌های لحظه‌ای برای تیکر صفحهٔ اصلی. آخرین همگام‌سازی از TGJU: {lastSyncLabel}.
        </p>
      </div>

      {/* StatCards grid */}
      <dl
        className="grid grid-cols-1 sm:grid-cols-3"
        style={{ gap: 'var(--ds-space-4)' }}
        role="list"
      >
        <StatCard
          label="کل نرخ‌ها"
          value={total.toLocaleString('fa-IR')}
          accent="brand"
        />
        <StatCard
          label="خودکار (TGJU)"
          value={auto.toLocaleString('fa-IR')}
          accent="emerald"
        />
        <StatCard
          label="دستی"
          value={manual.toLocaleString('fa-IR')}
          accent="amber"
        />
      </dl>
    </header>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: Accent;
}) {
  const accentColor =
    accent === 'brand'
      ? 'var(--ds-brand-500)'
      : accent === 'emerald'
        ? 'var(--ds-accent-emerald)'
        : 'var(--ds-accent-amber)';

  return (
    <div
      role="listitem"
      className="ds-stat-card flex flex-col gap-1.5 backdrop-blur-sm transition-shadow"
      style={{
        background: 'var(--ds-surface)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--ds-radius-lg)',
        padding: 'var(--ds-space-4) var(--ds-space-5)',
        boxShadow: 'var(--ds-shadow-sm)',
      }}
    >
      <dt
        className="font-semibold uppercase"
        style={{
          fontSize: 'var(--ds-text-xs)',
          letterSpacing: '0.06em',
          color: 'var(--ds-text-muted)',
        }}
      >
        {label}
      </dt>
      <dd
        className="font-extrabold tabular-nums"
        style={{
          fontSize: 'var(--ds-text-2xl)',
          lineHeight: 'var(--ds-leading-tight)',
          color: accentColor,
          margin: 0,
        }}
      >
        {value}
      </dd>
    </div>
  );
}
