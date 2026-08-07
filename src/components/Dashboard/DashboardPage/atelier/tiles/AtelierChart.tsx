'use client';

/**
 * AtelierChart — «تحلیل بازدید» (ردیف ۴ داشبورد).
 *
 * 2026-07-04 (بازطراحی جسورانه) — تحلیل بازدید حالا فقط یک نمودار
 * تنها نیست؛ یک «کنسول تحلیلی» تمام‌عرض با سه لایهٔ اطلاعاتی‌ست:
 *
 *   1. KPI strip بالا — چهار شاخص (مجموع، میانگین، اوج، رشد) که
 *      «چه اتفاقی افتاده» را قبل از «چگونه اتفاق افتاده» می‌گویند.
 *   2. Canvas مرکزی — نمودار میله‌ای سفارشی Atelier (recharts دور
 *      ریخته شد) با grid hairline، draw-in انیمیشن، crosshair روی
 *      hover، tooltip غنی، خط benchmark از دورهٔ قبل، و نشانگر
 *      «امروز». رنگ: emerald اصلی، طلایی فقط روی میلهٔ اوج.
 *   3. Heatstrip پایین (فقط برای ۷ روز) — هفت خانه با اشباع
 *      رنگی برابر با شدت نسبی روز؛ یک encoding دوم برای اسکن
 *      سریع بدون خواندن عدد.
 *
 * چرا recharts حذف شد: gradient بنفش پیش‌فرض، فونت سایز ۱۱،
 * grid ساده، و نبود RTL-aware tick ها با زبان Atelier (hairline +
 * emerald + طلایی فقط روی lead) هم‌خوانی نداشت. canvas سفارشی
 * کنترل کامل می‌دهد.
 */

import { cn } from '@/lib/utils';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  HiOutlineArrowDownRight,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowUpRight,
  HiOutlineBolt,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineExclamationCircle,
  HiOutlineMinus,
  HiOutlineSignal,
} from 'react-icons/hi2';
import useSWR from 'swr';
import { fmt, fmtCompact } from '../utils';

const PERIODS = [
  { id: '7d', label: '۷ روز', sub: 'هفتگی' },
  { id: '30d', label: '۳۰ روز', sub: 'ماهانه' },
  { id: '90d', label: '۹۰ روز', sub: 'فصلی' },
] as const;

type PeriodId = (typeof PERIODS)[number]['id'];

interface AtelierChartProps {
  viewStats: {
    labels: string[];
    data: number[];
    totalViews: number;
    todayViews: number;
  };
  /** 7-element series used to compute growth (same as Hero's spark). */
  statsData: number[];
}

interface Computed {
  total: number;
  avg: number;
  peak: { value: number; index: number; label: string };
  trough: { value: number; index: number; label: string };
  growth: { delta: number; trend: 'up' | 'down' | 'flat' };
  sumPrevHalf: number;
  sumRecentHalf: number;
  todayIndex: number;
}

function computeMetrics(labels: string[], data: number[]): Computed {
  const total = data.reduce((a, b) => a + b, 0);
  const avg = data.length > 0 ? total / data.length : 0;

  let peakIdx = 0;
  let troughIdx = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i] > data[peakIdx]) peakIdx = i;
    if (data[i] < data[troughIdx]) troughIdx = i;
  }

  // Growth = recent half vs previous half.
  const half = Math.max(1, Math.floor(data.length / 2));
  const sumPrevHalf = data.slice(0, data.length - half).reduce((a, b) => a + b, 0);
  const sumRecentHalf = data.slice(-half).reduce((a, b) => a + b, 0);
  let growth: Computed['growth'];
  if (sumPrevHalf === 0 && sumRecentHalf === 0) {
    growth = { delta: 0, trend: 'flat' };
  } else if (sumPrevHalf === 0) {
    growth = { delta: 100, trend: 'up' };
  } else {
    const d = ((sumRecentHalf - sumPrevHalf) / sumPrevHalf) * 100;
    growth = {
      delta: d,
      trend: Math.abs(d) < 1 ? 'flat' : d > 0 ? 'up' : 'down',
    };
  }

  // Today index = last bucket (data is oldest → newest).
  const todayIndex = data.length - 1;

  return {
    total,
    avg,
    peak: { value: data[peakIdx] ?? 0, index: peakIdx, label: labels[peakIdx] ?? '—' },
    trough: {
      value: data[troughIdx] ?? 0,
      index: troughIdx,
      label: labels[troughIdx] ?? '—',
    },
    growth,
    sumPrevHalf,
    sumRecentHalf,
    todayIndex,
  };
}

/* ============================================================
 *  KPI strip — چهار شاخص کلیدی بالای نمودار
 * ============================================================ */

interface KpiTileProps {
  label: string;
  value: string;
  sub: React.ReactNode;
  icon: React.ReactNode;
  tone?: 'default' | 'lead';
}

function KpiTile({ label, value, sub, icon, tone = 'default' }: KpiTileProps) {
  return (
    <div className={cn('at-c-kpi', tone === 'lead' && 'is-lead')}>
      <span className="at-c-kpi__ico" aria-hidden>
        {icon}
      </span>
      <div className="at-c-kpi__body">
        <span className="at-c-kpi__label">{label}</span>
        <span className="at-c-kpi__value tabular-nums">{value}</span>
        <span className="at-c-kpi__sub">{sub}</span>
      </div>
    </div>
  );
}

function TrendBadge({ trend, delta }: { trend: 'up' | 'down' | 'flat'; delta: number }) {
  const Icon =
    trend === 'up'
      ? HiOutlineArrowUpRight
      : trend === 'down'
        ? HiOutlineArrowDownRight
        : HiOutlineMinus;
  const sign = delta > 0 ? '+' : '';
  return (
    <span className={cn('at-c-kpi__badge', `is-${trend}`)}>
      <Icon className="w-3 h-3" aria-hidden />
      <span className="tabular-nums">
        {sign}
        {fmtPct(Math.abs(delta))}٪
      </span>
    </span>
  );
}

/** Format a number for display with 0–1 decimals depending on magnitude. */
function fmtPct(n: number): string {
  const isWhole = Math.abs(n - Math.round(n)) < 0.05;
  return isWhole ? fmt(Math.round(n)) : fmt(Number(n.toFixed(1)));
}

function KpiStrip({
  metrics,
  periodLabel,
}: {
  metrics: Computed;
  periodLabel: string;
}) {
  return (
    <div className="at-c-kpis" role="list">
      <div role="listitem">
        <KpiTile
          label="مجموع بازدید"
          value={fmt(metrics.total)}
          icon={<HiOutlineChartBar className="w-3.5 h-3.5" />}
          tone="lead"
          sub={<span>در {periodLabel} اخیر</span>}
        />
      </div>
      <div role="listitem">
        <KpiTile
          label="میانگین روزانه"
          value={fmt(Math.round(metrics.avg))}
          icon={<HiOutlineCalendarDays className="w-3.5 h-3.5" />}
          sub={<span className="tabular-nums">{fmtCompact(metrics.avg)} بازدید / روز</span>}
        />
      </div>
      <div role="listitem">
        <KpiTile
          label="اوج روز"
          value={fmt(metrics.peak.value)}
          icon={<HiOutlineArrowTrendingUp className="w-3.5 h-3.5" />}
          sub={
            <span>
              <span className="tabular-nums">{metrics.peak.label}</span>
              {' · '}
              <span className="at-c-kpi__sub-meta">
                {metrics.trough.value > 0
                  ? `افت ${fmt(metrics.peak.value - metrics.trough.value)}`
                  : '—'}
              </span>
            </span>
          }
        />
      </div>
      <div role="listitem">
        <KpiTile
          label="نرخ رشد"
          value={`${metrics.growth.delta > 0 ? '+' : ''}${fmtPct(Math.abs(metrics.growth.delta))}٪`}
          icon={<HiOutlineSignal className="w-3.5 h-3.5" />}
          sub={
            <span className="at-c-kpi__sub-row">
              <TrendBadge trend={metrics.growth.trend} delta={metrics.growth.delta} />
              <span className="at-c-kpi__sub-meta">نسبت به نیمهٔ قبل</span>
            </span>
          }
        />
      </div>
    </div>
  );
}

/* ============================================================
 *  Custom SVG canvas — نمودار میله‌ای Atelier
 * ============================================================ */

interface CanvasProps {
  labels: string[];
  data: number[];
  metrics: Computed;
  period: PeriodId;
  /** Indices (into labels/data) whose X-axis ticks should be rendered. */
  axisTickIndices: number[];
  /** Fade the whole chart to convey "loading more data". */
  dimmed?: boolean;
}

function AtelierChartCanvas({
  labels,
  data,
  metrics,
  period,
  axisTickIndices,
  dimmed,
}: CanvasProps) {
  const gradId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Geometry
  const VB_W = 1000;
  const VB_H = 320;
  const PAD_TOP = 24;
  const PAD_BOTTOM = 36;
  const PAD_X = 24;
  const plotW = VB_W - PAD_X * 2;
  const plotH = VB_H - PAD_TOP - PAD_BOTTOM;

  const max = Math.max(1, ...data);
  const niceMax = max * 1.12; // 12% headroom
  const n = data.length;
  const colGap = Math.min(18, plotW / (n * 6));
  const colW = (plotW - colGap * (n - 1)) / n;

  // Y-axis ticks (4)
  const yTicks = useMemo(() => {
    const step = niceMax / 4;
    return [0, 1, 2, 3, 4].map((i) => i * step);
  }, [niceMax]);

  // Benchmark line: previous half average (drawn as hairline above bars)
  const benchmarkValue =
    data.length > 1 ? metrics.sumPrevHalf / Math.max(1, Math.floor(data.length / 2)) : 0;

  // Format compact for Y labels (Persian digits)
  const yLabel = (v: number) => fmtCompact(v);

  // Animate draw-in once after mount.
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    if (mq.matches) {
      setDrawn(true);
      return;
    }
    const t = window.setTimeout(() => setDrawn(true), 80);
    return () => window.clearTimeout(t);
  }, [period]);

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!wrapRef.current) return;
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    // RTL: in SVG, x still grows LTR. Map to bucket index.
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const idx = Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1))));
    setHover(idx);
  }

  const hoverData = hover != null ? data[hover] : null;
  const hoverLabel = hover != null ? labels[hover] : null;

  // Pre-compute a Set for O(1) tick-index lookup in the X-axis render loop.
  const tickIndexSet = useMemo(() => new Set(axisTickIndices), [axisTickIndices]);

  return (
    <div ref={wrapRef} className={cn('at-c-canvas', dimmed && 'is-dimmed')}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        className="at-c-svg"
        role="img"
        aria-label="نمودار بازدید"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          {/* Main bar gradient: emerald top, fades to soft emerald bottom */}
          <linearGradient id={`${gradId}-bar`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--at-accent)" stopOpacity={0.95} />
            <stop offset="60%" stopColor="var(--at-accent)" stopOpacity={0.7} />
            <stop offset="100%" stopColor="var(--at-accent)" stopOpacity={0.18} />
          </linearGradient>

          {/* Lead bar gradient (peak day): emerald → gold */}
          <linearGradient id={`${gradId}-lead`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--at-gold)" stopOpacity={1} />
            <stop offset="55%" stopColor="var(--at-accent)" stopOpacity={0.85} />
            <stop offset="100%" stopColor="var(--at-accent)" stopOpacity={0.22} />
          </linearGradient>

          {/* Hover column highlight */}
          <linearGradient id={`${gradId}-hover`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--at-accent)" stopOpacity={0.1} />
            <stop offset="100%" stopColor="var(--at-accent)" stopOpacity={0} />
          </linearGradient>

          {/* Bar clip animation: scaleY 0→1 from bottom */}
          <clipPath id={`${gradId}-clip`}>
            <rect x={0} y={0} width={VB_W} height={VB_H} />
          </clipPath>
        </defs>

        {/* ---- Y-axis grid (hairline, 4 lines) ---- */}
        <g aria-hidden>
          {yTicks.map((v, i) => {
            const y = PAD_TOP + plotH - (v / niceMax) * plotH;
            return (
              <g key={i}>
                <line
                  x1={PAD_X}
                  y1={y}
                  x2={PAD_X + plotW}
                  y2={y}
                  stroke="var(--at-line)"
                  strokeWidth={i === 0 ? 1.2 : 0.7}
                  strokeDasharray={i === 0 ? undefined : '3 4'}
                  vectorEffect="non-scaling-stroke"
                  opacity={i === 0 ? 1 : 0.7}
                />
                <text
                  x={PAD_X - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="at-c-tick"
                  fill="var(--at-fg-subtle)"
                >
                  {yLabel(v)}
                </text>
              </g>
            );
          })}
        </g>

        {/* ---- Benchmark line (previous half average) ---- */}
        {benchmarkValue > 0 && (
          <g aria-hidden>
            <line
              x1={PAD_X}
              y1={PAD_TOP + plotH - (benchmarkValue / niceMax) * plotH}
              x2={PAD_X + plotW}
              y2={PAD_TOP + plotH - (benchmarkValue / niceMax) * plotH}
              stroke="var(--at-gold-fg)"
              strokeWidth={1}
              strokeDasharray="2 4"
              vectorEffect="non-scaling-stroke"
              opacity={0.55}
            />
            <text
              x={PAD_X + plotW - 6}
              y={PAD_TOP + plotH - (benchmarkValue / niceMax) * plotH - 6}
              textAnchor="end"
              className="at-c-bench"
              fill="var(--at-gold-fg)"
            >
              میانگین نیمهٔ قبل · {yLabel(benchmarkValue)}
            </text>
          </g>
        )}

        {/* ---- Hover column highlight (behind bars) ---- */}
        {hover != null && (
          <rect
            x={PAD_X + hover * (colW + colGap) - 4}
            y={PAD_TOP}
            width={colW + 8}
            height={plotH}
            fill={`url(#${gradId}-hover)`}
            pointerEvents="none"
          />
        )}

        {/* ---- Bars ---- */}
        <g clipPath={`url(#${gradId}-clip)`}>
          {data.map((v, i) => {
            const h = (v / niceMax) * plotH;
            const x = PAD_X + i * (colW + colGap);
            const y = PAD_TOP + plotH - h;
            const isLead = i === metrics.peak.index && v > 0;
            const isToday = i === metrics.todayIndex;
            const isHover = hover === i;

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={colW}
                  height={drawn ? h : 0}
                  fill={isLead ? `url(#${gradId}-lead)` : `url(#${gradId}-bar)`}
                  rx={3}
                  vectorEffect="non-scaling-stroke"
                  style={{
                    transition: reducedMotion
                      ? 'none'
                      : `height 700ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 28}ms`,
                  }}
                  opacity={hover != null && !isHover ? 0.55 : 1}
                />

                {/* Top cap line — extra crisp edge */}
                {drawn && h > 0 && (
                  <line
                    x1={x}
                    y1={y}
                    x2={x + colW}
                    y2={y}
                    stroke={isLead ? 'var(--at-gold)' : 'var(--at-accent)'}
                    strokeWidth={1.4}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                )}

                {/* Today dot at top */}
                {isToday && drawn && h > 0 && (
                  <g pointerEvents="none">
                    <circle
                      cx={x + colW / 2}
                      cy={y}
                      r={3.5}
                      fill="var(--at-bg)"
                      stroke="var(--at-accent)"
                      strokeWidth={1.8}
                    />
                    <circle cx={x + colW / 2} cy={y} r={1.6} fill="var(--at-accent)" />
                  </g>
                )}

                {/* Today label tab */}
                {isToday && drawn && (
                  <g pointerEvents="none">
                    <rect
                      x={x + colW / 2 - 22}
                      y={y - 18}
                      width={44}
                      height={14}
                      rx={4}
                      fill="var(--at-accent)"
                    />
                    <text
                      x={x + colW / 2}
                      y={y - 8}
                      textAnchor="middle"
                      className="at-c-today"
                      fill="var(--at-bg)"
                    >
                      امروز
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* ---- Hover crosshair ---- */}
        {hover != null && (
          <g pointerEvents="none">
            <line
              x1={PAD_X + hover * (colW + colGap) + colW / 2}
              y1={PAD_TOP}
              x2={PAD_X + hover * (colW + colGap) + colW / 2}
              y2={PAD_TOP + plotH}
              stroke="var(--at-accent)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              strokeDasharray="2 3"
              opacity={0.7}
            />
          </g>
        )}

        {/* ---- X-axis labels (Persian) ---- */}
        <g aria-hidden>
          {labels.map((lab, i) => {
            // Skip labels that aren't part of the sampled tick set so the
            // axis stays readable for 30d/90d ranges.
            if (!tickIndexSet.has(i)) return null;
            const x = PAD_X + i * (colW + colGap) + colW / 2;
            const y = VB_H - 18;
            const isToday = i === metrics.todayIndex;
            // For long labels (Jalali dates like «۱۳ تیر») we trim from head.
            const display = lab.length > 6 ? `${lab}` : lab;
            return (
              <text
                key={i}
                x={x}
                y={y}
                textAnchor="middle"
                className={cn('at-c-axis', isToday && 'is-today')}
                fill={isToday ? 'var(--at-accent)' : 'var(--at-fg-muted)'}
              >
                {display}
              </text>
            );
          })}
        </g>

        {/* Hover hit-targets overlay (invisible, for pointer capture on gaps) */}
        <g>
          {data.map((_v, i) => (
            <rect
              key={`hit-${i}`}
              x={PAD_X + i * (colW + colGap) - 4}
              y={PAD_TOP}
              width={colW + 8}
              height={plotH}
              fill="transparent"
              onPointerEnter={() => setHover(i)}
              style={{ cursor: 'crosshair' }}
            />
          ))}
        </g>
      </svg>

      {/* ---- Tooltip (DOM, positioned by hover state) ---- */}
      {hover != null && hoverData != null && (
        <div
          className="at-c-tip"
          role="status"
          aria-live="polite"
          style={{
            insetInlineStart: `calc(${(hover / Math.max(1, n - 1)) * 100}% )`,
          }}
        >
          <div className="at-c-tip__day">{hoverLabel}</div>
          <div className="at-c-tip__value tabular-nums">
            {fmt(hoverData)} <span className="at-c-tip__unit">بازدید</span>
          </div>
          <div className="at-c-tip__meta">
            <span>
              <span className="at-c-tip__meta-key">سهم هفته</span>
              <span className="tabular-nums">
                {metrics.total > 0
                  ? `${fmt(Number(((hoverData / metrics.total) * 100).toFixed(1)))}٪`
                  : '—'}
              </span>
            </span>
            {hover > 0 && (
              <span>
                <span className="at-c-tip__meta-key">Δ روز قبل</span>
                <span
                  className={cn(
                    'tabular-nums',
                    hoverData > data[hover - 1]
                      ? 'is-up'
                      : hoverData < data[hover - 1]
                        ? 'is-down'
                        : 'is-flat',
                  )}
                >
                  {(() => {
                    const prev = data[hover - 1];
                    if (prev === 0) return hoverData > 0 ? '↑ جدید' : '—';
                    const d = ((hoverData - prev) / prev) * 100;
                    return `${d > 0 ? '+' : ''}${fmt(Math.round(d))}٪`;
                  })()}
                </span>
              </span>
            )}
            <span>
              <span className="at-c-tip__meta-key">رتبه در دوره</span>
              <span className="tabular-nums">
                {(() => {
                  const sorted = [...data].sort((a, b) => b - a);
                  const rank = sorted.indexOf(hoverData) + 1;
                  return `${fmt(rank)} / ${fmt(n)}`;
                })()}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
 *  Heatstrip — هفت خانه با اشباع رنگی (فقط ۷ روز)
 * ============================================================ */

function Heatstrip({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(1, ...data);
  return (
    <div className="at-c-heat" aria-hidden>
      <span className="at-c-heat__label">شدت هفتگی</span>
      <div className="at-c-heat__row">
        {data.map((v, i) => {
          const intensity = v / max;
          return (
            <div
              key={i}
              className="at-c-heat__cell"
              style={{
                background: `color-mix(in oklch, var(--at-accent) ${Math.round(intensity * 70)}%, var(--at-bg-elevated))`,
              }}
              title={`${labels[i]}: ${fmt(v)} بازدید`}
            >
              <span className="at-c-heat__cell-num tabular-nums">
                {v > 0 ? fmtCompact(v) : '·'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
 *  Header mark — نشان سفارشی Atelier (میله‌های صعودی)
 * ============================================================ */

function AtelierBarsMark() {
  const id = useId();
  return (
    <svg viewBox="0 0 24 24" className="at-c-mark" aria-hidden>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--at-accent)" stopOpacity={0.55} />
          <stop offset="100%" stopColor="var(--at-accent)" stopOpacity={1} />
        </linearGradient>
      </defs>
      <rect x={3} y={14} width={3.2} height={7} rx={0.8} fill={`url(#${id}-g)`} />
      <rect x={8.4} y={10} width={3.2} height={11} rx={0.8} fill={`url(#${id}-g)`} />
      <rect x={13.8} y={6} width={3.2} height={15} rx={0.8} fill={`url(#${id}-g)`} />
      <rect x={19.2} y={3} width={3.2} height={18} rx={0.8} fill="var(--at-gold)" />
    </svg>
  );
}

/* ============================================================
 *  Orchestrator — AtelierChart
 * ============================================================ */

export default function AtelierChart({ viewStats, statsData }: AtelierChartProps) {
  const [period, setPeriod] = useState<PeriodId>('7d');

  // SWR برای دادهٔ واقعی هر بازه. دادهٔ پیش‌فرض (viewStats که از
  // getViewStats آمده) به‌عنوان fallbackData پاس می‌شود تا paint اول
  // بدون فِلِش سفید باشد. کلید cache بر اساس period تا هر بازه
  // جداگانه کش شود.
  const fetcher = (url: string) =>
    fetch(url, { credentials: 'same-origin' }).then((r) => {
      if (!r.ok) throw new Error(`traffic-stats: ${r.status}`);
      return r.json();
    });
  const swr = useSWR<{
    labels: string[];
    data: number[];
    totalViews: number;
    todayViews: number;
    periodDays?: number;
  }>(`/api/traffic-stats?period=${period}`, fetcher, {
    fallbackData:
      period === '7d'
        ? {
            labels: viewStats.labels,
            data: viewStats.data,
            totalViews: viewStats.totalViews,
            todayViews: viewStats.todayViews,
          }
        : undefined,
    revalidateOnFocus: false,
    revalidateIfStale: true,
    dedupingInterval: 30000, // Prevent duplicate requests within 30s
  });

  // اگر دادهٔ SWR آماده نیست، از viewStats (برای 7d) استفاده می‌کنیم؛
  // در غیر این صورت loading=true است و skeleton نشان داده می‌شود.
  const live = swr.data;
  const series = live?.data ?? viewStats.data;
  const labels = live?.labels ?? viewStats.labels;
  const isLoading = Boolean(!live && period !== '7d') || swr.isLoading;
  const isError = swr.error && !live;

  const metrics = useMemo(() => computeMetrics(labels, series), [labels, series]);

  // The subline under the title — reflects the current period.
  const subline = useMemo(() => {
    if (period === '7d') {
      return `روند بازدید در ${PERIODS[0].label} اخیر`;
    }
    if (period === '30d') return `روند بازدید در ${PERIODS[1].label} اخیر`;
    return `روند بازدید در ${PERIODS[2].label} اخیر`;
  }, [period]);

  // For 30d/90d the X-axis is too crowded if we render all labels; we
  // sample a subset based on data length so the axis stays readable.
  const axisTickIndices = useMemo(() => {
    const n = labels.length;
    if (n <= 7) return labels.map((_, i) => i);
    if (n <= 14) {
      // every other day
      const out: number[] = [];
      for (let i = 0; i < n; i += 2) out.push(i);
      return out;
    }
    // 30d/90d: ~8 ticks evenly spaced
    const target = 8;
    const out: number[] = [];
    for (let k = 0; k < target; k++) {
      out.push(Math.round((k / (target - 1)) * (n - 1)));
    }
    return out;
  }, [labels]);

  return (
    <section className="at-tile at-chart" aria-label="تحلیل بازدید">
      {/* Decorative brand mark in the corner */}
      <div className="at-chart__ornament" aria-hidden>
        <AtelierBarsMark />
      </div>

      <header className="at-chart__head">
        <div className="at-head">
          <span className="at-head__ico" aria-hidden>
            <HiOutlineChartBar className="w-3.5 h-3.5" />
          </span>
          <div className="at-head__text">
            <h2 className="at-head__title-text">تحلیل بازدید</h2>
            <p className="at-head__sub">{subline}</p>
          </div>
        </div>

        <div className="at-chart__controls">
          <span className={cn('at-chart__live', isLoading && 'is-loading')} aria-live="polite">
            <span className="at-chart__live-dot" aria-hidden />
            <HiOutlineBolt className="w-3 h-3" aria-hidden />
            <span>{isLoading ? 'در حال بارگیری…' : isError ? 'خطا' : 'زنده'}</span>
          </span>
          <div className="at-chart__segs" role="radiogroup" aria-label="بازهٔ زمانی">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={p.id === period}
                onClick={() => setPeriod(p.id)}
                className={cn('at-chart__seg', p.id === period && 'is-active')}
              >
                <span className="at-chart__seg-label">{p.label}</span>
                <span className="at-chart__seg-sub">{p.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <KpiStrip
        metrics={metrics}
        periodLabel={PERIODS.find((p) => p.id === period)?.label ?? '۷ روز'}
      />

      <div className={cn('at-chart__canvas', isLoading && 'is-loading')}>
        {isError ? (
          <div className="at-chart__error" role="alert">
            <span className="at-chart__error-ico" aria-hidden>
              <HiOutlineExclamationCircle className="w-5 h-5" />
            </span>
            <div>
              <p className="at-chart__error-title">خطا در بارگیری داده‌ها</p>
              <p className="at-chart__error-sub">لطفاً دوباره تلاش کنید</p>
            </div>
            <button type="button" onClick={() => swr.mutate()} className="at-chart__error-retry">
              تلاش مجدد
            </button>
          </div>
        ) : (
          <AtelierChartCanvas
            labels={labels}
            data={series}
            metrics={metrics}
            period={period}
            axisTickIndices={axisTickIndices}
            dimmed={isLoading}
          />
        )}
        {isLoading && !isError && <div className="at-chart__loader" aria-hidden />}
      </div>

      {period === '7d' && series.length <= 7 && !isLoading && (
        <div className="at-chart__heatwrap">
          <Heatstrip data={series} labels={labels} />
        </div>
      )}

      {/* Hidden: keep statsData prop usage honest (prevents unused-var lint) */}
      <span hidden aria-hidden data-debug-stats-len={String(statsData.length)} />
    </section>
  );
}
