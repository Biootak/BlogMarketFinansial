'use client';

import { toPersianDigits } from '@/lib/setup/format';
import s from '../jobs.module.css';

export interface JobVitalsProps {
  /** total completed in last 24h */
  completed24h: number;
  /** pending jobs (still in queue) */
  pending: number;
  /** currently running jobs */
  running: number;
  /** total failed in last 24h */
  failed24h: number;
  /** total in dead-letter */
  dead: number;
  /** success rate 0..100 */
  successRate: number;
  /** average job duration in ms */
  avgDurationMs: number;
  /** hourly throughput — 24 numbers (oldest first) */
  hourly: number[];
  /** failure rate trend vs yesterday, e.g. -3 = 3% better */
  failureRateTrend: number;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${toPersianDigits(Math.round(ms))} ms`;
  if (ms < 60_000) return `${toPersianDigits((ms / 1000).toFixed(1))} ث`;
  if (ms < 3_600_000) return `${toPersianDigits(Math.round(ms / 60_000))} دق`;
  return `${toPersianDigits((ms / 3_600_000).toFixed(1))} س`;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const w = 100;
  const h = 32;
  const stepX = w / Math.max(data.length - 1, 1);
  const points = data
    .map((v, i) => `${(i * stepX).toFixed(2)},${(h - (v / max) * h).toFixed(2)}`)
    .join(' ');
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  const id = `spark-${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg
      className={s.vitalTileSpark}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${id})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function JobVitals({
  completed24h,
  pending,
  running,
  failed24h,
  dead,
  successRate,
  avgDurationMs,
  hourly,
  failureRateTrend,
}: JobVitalsProps) {
  // p95 approximation: pick the value at 95% index
  const p95 = (() => {
    if (hourly.length === 0) return 0;
    const sorted = [...hourly].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
    return sorted[idx];
  })();

  const trendDown = failureRateTrend < 0;
  return (
    <section className={s.vitals} aria-label="شاخص‌های کلیدی سیستم">
      <div className={s.vitalsMajorGrid}>
        {/* Tile 1: Throughput (indigo) */}
        <div className={`${s.vitalTile} ${s['vitalTile--indigo']}`}>
          <div className={s.vitalTileHeader}>
            <span className={s.vitalTileLabel}>Throughput · ۲۴ ساعت</span>
          </div>
          <div>
            <span className={s.vitalTileValue}>{toPersianDigits(completed24h)}</span>
            <span className={s.vitalTileUnit}>job تکمیل‌شده</span>
          </div>
          <Sparkline data={hourly} color="oklch(60% 0.14 255)" />
          <div className={s.vitalTileFooter}>
            <span>ساعتی</span>
            <span>
              peak {toPersianDigits(Math.max(...hourly, 0))}/h
            </span>
          </div>
        </div>

        {/* Tile 2: Active workers (emerald) */}
        <div className={`${s.vitalTile} ${s['vitalTile--emerald']}`}>
          <div className={s.vitalTileHeader}>
            <span className={s.vitalTileLabel}>Workers فعال</span>
            <span className={s.vitalTileTrend}>{toPersianDigits(running)} در حال اجرا</span>
          </div>
          <div>
            <span className={s.vitalTileValue}>{toPersianDigits(pending + running)}</span>
            <span className={s.vitalTileUnit}>در صف + اجرا</span>
          </div>
          <div className={s.vitalTileFooter} style={{ height: 32, alignItems: 'flex-end' }}>
            <span>صف فعال</span>
            <span>{toPersianDigits(pending)} منتظر · {toPersianDigits(running)} اجرا</span>
          </div>
        </div>

        {/* Tile 3: Failure rate (amber/rose) */}
        <div className={`${s.vitalTile} ${s['vitalTile--amber']}`}>
          <div className={s.vitalTileHeader}>
            <span className={s.vitalTileLabel}>نرخ موفقیت</span>
            <span
              className={
                trendDown
                  ? `${s.vitalTileTrend} ${s['vitalTileTrend--down']}`
                  : s.vitalTileTrend
              }
            >
              {trendDown ? '▼' : '▲'} {toPersianDigits(Math.abs(failureRateTrend))}٪
            </span>
          </div>
          <div>
            <span className={s.vitalTileValue}>
              {toPersianDigits(successRate.toFixed(1))}
              <span className={s.vitalTileUnit}>٪</span>
            </span>
          </div>
          <div className={s.vitalTileFooter} style={{ height: 32, alignItems: 'flex-end' }}>
            <span>خطای ۲۴ ساعت</span>
            <span>{toPersianDigits(failed24h)} مورد</span>
          </div>
        </div>

        {/* Tile 4: DLQ (rose) */}
        <div className={`${s.vitalTile} ${s['vitalTile--rose']}`}>
          <div className={s.vitalTileHeader}>
            <span className={s.vitalTileLabel}>صف مرده</span>
            {dead > 0 ? (
              <span className={`${s.vitalTileTrend} ${s['vitalTileTrend--down']}`}>
                {toPersianDigits(dead)} نیاز به اقدام
              </span>
            ) : (
              <span className={s.vitalTileTrend}>پاک</span>
            )}
          </div>
          <div>
            <span className={s.vitalTileValue}>{toPersianDigits(dead)}</span>
            <span className={s.vitalTileUnit}>job مرده</span>
          </div>
          <div className={s.vitalTileFooter} style={{ height: 32, alignItems: 'flex-end' }}>
            <span>پایان خط لوله</span>
            <span>
              {dead > 0 ? (
                <a href="/dashboard/jobs/dlq" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  بازبینی ←
                </a>
              ) : (
                'هیچ موردی'
              )}
            </span>
          </div>
        </div>
      </div>

      <div className={s.vitalsMinorGrid}>
        <div className={s.vitalMinor}>
          <span className={s.vitalMinorLabel}>میانگین زمان</span>
          <span className={s.vitalMinorValue}>{formatDuration(avgDurationMs)}</span>
          <span className={s.vitalMinorSub}>هر job</span>
        </div>
        <div className={s.vitalMinor}>
          <span className={s.vitalMinorLabel}>p95 ساعتی</span>
          <span className={s.vitalMinorValue}>{toPersianDigits(p95)}</span>
          <span className={s.vitalMinorSub}>job در ساعت</span>
        </div>
        <div className={s.vitalMinor}>
          <span className={s.vitalMinorLabel}>صف‌های فعال</span>
          <span className={s.vitalMinorValue}>{toPersianDigits(pending)}</span>
          <span className={s.vitalMinorSub}>در انتظار پردازش</span>
        </div>
        <div className={s.vitalMinor}>
          <span className={s.vitalMinorLabel}>میانگین تلاش</span>
          <span className={s.vitalMinorValue}>۱.۰×</span>
          <span className={s.vitalMinorSub}>پایداری سامانه</span>
        </div>
      </div>
    </section>
  );
}

export default JobVitals;
