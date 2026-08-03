/**
 * ExchangeTransactionMix — radial conic-gradient donut (CSS-only).
 *
 * طراحی به جای pie/Recharts: فقط یک conic-gradient.
 * data-attribute mode = site dark/light را دنبال می‌کند چون
 * همه‌چیز از token می‌آید.
 */

import type { KindMix } from '@/actions/exchange-dashboard';
import { TX_KIND_COLOR, TX_KIND_FA } from '@/lib/exchange-labels';
import s from './ExchangeDashboard.module.css';

function buildConicStops(items: { share: number; kind: string }[]): string {
  // آیتم‌ها به ترتیب داده شده، share مجموع = 1 (normalize می‌کنیم)
  const total = items.reduce((s, it) => s + it.share, 0);
  if (total === 0) return 'var(--at-surface-hover)';
  let cursor = 0;
  const stops: string[] = [];
  for (const it of items) {
    const pct = (it.share / total) * 100;
    if (pct === 0) continue;
    const color = TX_KIND_COLOR[it.kind as keyof typeof TX_KIND_COLOR] ?? 'var(--at-accent)';
    const start = cursor;
    cursor += pct;
    stops.push(`${color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`);
  }
  if (cursor < 100) {
    stops.push(`var(--at-surface-hover) ${cursor.toFixed(2)}% 100%`);
  }
  return `conic-gradient(${stops.join(', ')})`;
}

function formatPercent(share: number): string {
  return new Intl.NumberFormat('fa-IR', { style: 'percent', maximumFractionDigits: 0 }).format(
    share,
  );
}

export default function ExchangeTransactionMix({ items }: { items: KindMix[] }) {
  const total = items.reduce((sum, it) => sum + it.count, 0);

  if (total === 0) {
    return <div className={s.flowEmpty}>در ۳۰ روز اخیر تراکنشی ثبت نشده است.</div>;
  }

  const conicStops = buildConicStops(items);

  return (
    <div className={s.mixLayout}>
      <div
        className={s.donut}
        style={{ background: conicStops }}
        role="img"
        aria-label="توزیع انواع تراکنش در ۳۰ روز اخیر"
      >
        <div className={s.donutCenter}>
          <span className={s.donutCenterTotal} dir="ltr">
            {new Intl.NumberFormat('fa-IR', { notation: 'compact' }).format(total)}
          </span>
          <span className={s.donutCenterLabel}>تراکنش ۳۰ روز</span>
        </div>
      </div>
      <div className={s.mixLegend}>
        {items
          .sort((a, b) => b.count - a.count)
          .map((it) => {
            const color =
              TX_KIND_COLOR[it.kind as keyof typeof TX_KIND_COLOR] ?? 'var(--at-accent)';
            return (
              <div key={it.kind} className={s.mixRow}>
                <span className={s.mixSwatch} style={{ background: color }} aria-hidden />
                <span className={s.mixLabel}>
                  {TX_KIND_FA[it.kind as keyof typeof TX_KIND_FA] ?? it.kind}
                </span>
                <span className={s.mixCount} dir="ltr">
                  {new Intl.NumberFormat('fa-IR').format(it.count)} · {formatPercent(it.share)}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
