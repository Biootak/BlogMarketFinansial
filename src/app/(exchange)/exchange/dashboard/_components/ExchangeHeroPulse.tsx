/**
 * ExchangeHeroPulse — signature moment of the dashboard.
 *
 * یک «pulse line» متحرک (SVG polyline) که ۷ روز اخیر را به‌صورت
 * ساده نشان می‌دهد، با system-breath opacity oscillation 0.5Hz
 * (ambient alive). کنارش یک CountUp با ease-out-expo.
 *
 * Server Component: اعداد به‌صورت string پاس می‌شوند (JSON-safe).
 */

import { ArrowDownRight, ArrowUpRight, Building2, Calendar, MapPin, Minus } from 'lucide-react';
import s from './ExchangeDashboard.module.css';

interface Props {
  /** حجم امروز به ارز primary (string — BigInt safe) */
  todayVolume: string;
  /** حجم دیروز (string) */
  yesterdayVolume: string;
  /** primary currency label */
  primaryCurrency: string;
  /** نام صراف */
  exchangeName: string;
  /** شهر صراف */
  city: string | null;
  /** weekly rhythm برای sparkline */
  sparkline: { volume: string; count: number }[];
  /** timestamp server now (ISO) — برای freshness indicator */
  nowIso: string;
}

function toAfnNumber(volumeStr: string): number {
  // amount is in "minor units" (÷ 100) — مثل تراکنش‌ها
  const minor = BigInt(volumeStr);
  // نمایش تا ۲ رقم اعشار — برای اعداد بزرگ منطق compact بهتر است
  const asNumber = Number(minor) / 100;
  return asNumber;
}

function formatCompact(value: number, locale = 'fa-IR'): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat('fa-IR', {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'never',
  }).format(value / 100);
}

export default function ExchangeHeroPulse({
  todayVolume,
  yesterdayVolume,
  primaryCurrency,
  exchangeName,
  city,
  sparkline,
  nowIso,
}: Props) {
  const todayNum = toAfnNumber(todayVolume);
  const yesterdayNum = toAfnNumber(yesterdayVolume);

  const deltaPct = yesterdayNum > 0 ? ((todayNum - yesterdayNum) / yesterdayNum) * 100 : 0;
  const trend: 'up' | 'down' | 'flat' = deltaPct > 0.5 ? 'up' : deltaPct < -0.5 ? 'down' : 'flat';

  // ── Sparkline geometry ──────────────────────────────────────────────
  const W = 320;
  const H = 90;
  const PAD = 8;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  const counts = sparkline.map((d) => d.count);
  const maxCount = Math.max(1, ...counts);
  const points = sparkline.map((d, i) => {
    const x = PAD + (i / Math.max(1, sparkline.length - 1)) * innerW;
    const y = PAD + (1 - d.count / maxCount) * innerH;
    return [x, y] as const;
  });
  const pathLine = points
    .map(([x, y], i) =>
      i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : `L${x.toFixed(1)} ${y.toFixed(1)}`,
    )
    .join(' ');
  const areaPath = `${pathLine} L${points.at(-1)?.[0].toFixed(1) ?? PAD} ${
    H - PAD
  } L${points[0]?.[0].toFixed(1) ?? PAD} ${H - PAD} Z`;

  const lastPoint = points.at(-1) ?? [PAD, H - PAD];

  // نمایش نام ماه شمسی
  const now = new Date(nowIso);
  const monthFa = new Intl.DateTimeFormat('fa-IR', { month: 'long' }).format(now);
  const dayFa = new Intl.DateTimeFormat('fa-IR', { day: 'numeric' }).format(now);

  return (
    <section className={s.hero} aria-label="خلاصهٔ امروز">
      <div className={s.heroMain}>
        <div className={s.heroEyebrow}>
          <span className={s.heroPulseDot} aria-hidden />
          <span>جریان زنده</span>
          <span aria-hidden>·</span>
          <span>
            {dayFa} {monthFa}
          </span>
        </div>

        <h2 className={s.heroTitle}>حجم معاملات امروز ({primaryCurrency})</h2>

        <div className={s.heroNumberRow}>
          <span className={s.heroNumber}>{formatCompact(todayNum)}</span>
          <span className={s.heroCurrency}>{primaryCurrency}</span>
          {yesterdayNum > 0 && (
            <span
              className={s.heroDelta}
              data-trend={trend}
              aria-label={`تغییر ${formatPercent(Math.abs(deltaPct))} نسبت به دیروز`}
            >
              {trend === 'up' && <ArrowUpRight size={14} aria-hidden />}
              {trend === 'down' && <ArrowDownRight size={14} aria-hidden />}
              {trend === 'flat' && <Minus size={14} aria-hidden />}
              <span dir="ltr">
                {deltaPct > 0 ? '+' : deltaPct < 0 ? '−' : ''}
                {formatPercent(Math.abs(deltaPct))}
              </span>
            </span>
          )}
        </div>

        <div className={s.heroMeta}>
          <span className={s.heroMetaItem}>
            <Building2 size={12} aria-hidden />
            <strong>{exchangeName}</strong>
          </span>
          {city && (
            <span className={s.heroMetaItem}>
              <MapPin size={12} aria-hidden />
              {city}
            </span>
          )}
          <span className={s.heroMetaItem}>
            <Calendar size={12} aria-hidden />
            دیروز:&nbsp;
            <strong dir="ltr">
              {formatCompact(yesterdayNum)} {primaryCurrency}
            </strong>
          </span>
        </div>
      </div>

      {/* mini bar sparkline — فقط موبایل/تبلت (زیر 1024px) */}
      <div className={s.heroMiniSpark} aria-hidden>
        {sparkline.map((d, i) => {
          const h = maxCount > 0 ? Math.max(4, Math.round((d.count / maxCount) * 40)) : 4;
          const isToday = i === sparkline.length - 1;
          return (
            <span
              key={i}
              className={s.heroMiniBar}
              data-today={isToday ? 'true' : undefined}
              style={{ height: `${h}px` }}
            />
          );
        })}
      </div>

      <div className={s.heroSpark} aria-hidden>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          role="presentation"
        >
          <defs>
            <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--at-accent)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--at-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* hairline gridlines */}
          {[0.25, 0.5, 0.75].map((p) => (
            <line
              key={p}
              x1={PAD}
              x2={W - PAD}
              y1={PAD + p * innerH}
              y2={PAD + p * innerH}
              stroke="var(--at-line)"
              strokeWidth="0.5"
              strokeDasharray="2 3"
            />
          ))}
          {/* fill area */}
          <path d={areaPath} fill="url(#heroFill)" />
          {/* line */}
          <path
            d={pathLine}
            fill="none"
            stroke="var(--at-accent)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="hero-breath"
          />
          {/* last point dot */}
          <circle
            cx={lastPoint[0]}
            cy={lastPoint[1]}
            r="3.5"
            fill="var(--at-bg)"
            stroke="var(--at-accent)"
            strokeWidth="1.5"
          />
          <circle
            cx={lastPoint[0]}
            cy={lastPoint[1]}
            r="6"
            fill="var(--at-accent)"
            opacity="0.25"
            className={s.heroBreath}
          />
        </svg>
      </div>
    </section>
  );
}
