// src/app/dashboard/exchange-rates/_components/ExchangeRatesHeader.tsx
// 2026-08-11 premium update: CSS module, lucide-react, elevation tiers,
// hover micro-interaction, mobile readability.

import { Activity, ArrowDownUp, BarChart3, HandCoins, Sparkles } from 'lucide-react';
import s from './ExchangeRatesHeader.module.css';

interface HeaderProps {
  total: number;
  active: number;
  auto: number;
  manual: number;
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
  icon: typeof BarChart3;
  accent: Accent;
}> = [
  { key: 'total', label: 'کل نرخ‌ها', icon: BarChart3, accent: 'brand' },
  { key: 'active', label: 'فعال', icon: Sparkles, accent: 'emerald' },
  { key: 'auto', label: 'خودکار (زنده)', icon: Activity, accent: 'cyan' },
  { key: 'manual', label: 'دستی', icon: HandCoins, accent: 'amber' },
  { key: 'coverage', label: 'پوشش کاتالوگ', icon: ArrowDownUp, accent: 'violet' },
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
    <div className={s.grid} role="list" aria-label="آمار کلی نرخ‌ها">
      {STAT_META.map(({ key, label, icon: Icon, accent }) => (
        <div key={key} className={s.card} role="listitem">
          <div className={s.header}>
            <span className={s.label}>{label}</span>
            <span className={`${s.iconWrap} ${s[`iconWrap_${accent}`]}`} aria-hidden>
              <Icon size={14} />
            </span>
          </div>
          <div className={`${s.value} ${s[`value_${accent}`]}`}>{values[key] ?? '۰'}</div>
          {(key === 'auto' || key === 'manual') && <div className={s.meta}>{lastSyncLabel}</div>}
        </div>
      ))}
    </div>
  );
}
