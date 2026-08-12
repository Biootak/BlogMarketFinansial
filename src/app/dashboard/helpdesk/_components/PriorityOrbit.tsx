'use client';

/**
 * PriorityOrbit — signature visual برای مرکز تیکت‌ها.
 * ---------------------------------------------------------------------------
 *  متافور: یک «سامانه‌ی مداری شیشه‌ای». چهار نوار مداری ابریشمی (band) که هر
 *  کدام متعلق به یک سطح اولویت است (urgent / high / normal / low). تیکت‌ها
 *  به‌صورت «سیاره‌های» کوچک با هاله‌ی نرم روی نوارها شناورند و آرام می‌چرخند.
 *  ماهِ کوچک رنگی کنار هر سیاره وضعیت تیکت را نشان می‌دهد. هسته‌ی مرکزی یک
 *  دیسک شیشه‌ای لایه‌ای است که شمارنده‌ی تیکت‌های باز را نمایش می‌دهد.
 *
 *  - token-based: تمام رنگ‌ها از --ds-* / oklch پالت hub
 *  - RTL-correct: فقط logical props، زاویه‌ها viewport-relative
 *  - 60fps: فقط transform / opacity، reduced-motion توسط global clamp مهار می‌شود
 *  - interactive: hover روی هر node، node highlight + label
 */

import { HUB_PALETTES, toOklch } from '@/components/Dashboard/PlatformHub/HubPalette';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import s from './PriorityOrbit.module.css';

export type OrbitPriority = 'urgent' | 'high' | 'normal' | 'low';
export type OrbitStatus = 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';

export interface OrbitTicket {
  id: string;
  subject: string;
  priority: OrbitPriority;
  status: OrbitStatus;
}

export interface PriorityOrbitProps {
  tickets: OrbitTicket[];
  /** aria-label */
  ariaLabel?: string;
  className?: string;
  /** callback وقتی روی یک node کلیک می‌شود */
  onSelect?: (id: string) => void;
  /** id تیکت انتخاب‌شده (highlight) */
  selectedId?: string | null;
}

const PRIORITY_ORDER: OrbitPriority[] = ['urgent', 'high', 'normal', 'low'];

const PRIORITY_TONE: Record<OrbitPriority, 'rose' | 'amber' | 'indigo' | 'neutral'> = {
  urgent: 'rose',
  high: 'amber',
  normal: 'indigo',
  low: 'neutral',
};

const PRIORITY_LABEL: Record<OrbitPriority, string> = {
  urgent: 'فوری',
  high: 'بالا',
  normal: 'معمولی',
  low: 'کم',
};

const STATUS_TONE: Record<OrbitStatus, 'emerald' | 'amber' | 'indigo' | 'cyan' | 'neutral'> = {
  open: 'cyan',
  pending: 'amber',
  in_progress: 'indigo',
  resolved: 'emerald',
  closed: 'neutral',
};

const HUE: Record<'rose' | 'amber' | 'indigo' | 'emerald' | 'cyan' | 'neutral', number> = {
  rose: 15,
  amber: 70,
  indigo: 245,
  emerald: 165,
  cyan: 200,
  neutral: 245,
};

const CHROMA: Record<'rose' | 'amber' | 'indigo' | 'emerald' | 'cyan' | 'neutral', number> = {
  rose: 0.13,
  amber: 0.12,
  indigo: 0.13,
  emerald: 0.12,
  cyan: 0.12,
  neutral: 0.005,
};

function colorForTone(tone: 'rose' | 'amber' | 'indigo' | 'emerald' | 'cyan' | 'neutral', l = 60) {
  return `oklch(${l}% ${CHROMA[tone]} ${HUE[tone]})`;
}

/** هر priority یک radius دارد (درصد از viewBox). */
const LANE_RADIUS: Record<OrbitPriority, number> = {
  urgent: 22, // نزدیک‌ترین — بحرانی‌ترین
  high: 30,
  normal: 38,
  low: 46, // دورترین — کم‌اهمیت‌ترین
};

/** محاسبه موقعیت یک node روی مدار (با درصد از viewBox). */
function nodePos(index: number, total: number, radius: number, seed: number) {
  // توزیع مساوی روی دایره، با چرخش اولیه بر اساس seed برای تنوع
  const startAngle = -90 + (seed % 360);
  const angle = startAngle + (360 / Math.max(total, 1)) * index;
  const rad = (angle * Math.PI) / 180;
  return {
    x: 50 + radius * Math.cos(rad),
    y: 50 + radius * Math.sin(rad),
  };
}

/** seed ساده از id (برای تنوع چیدمان) */
function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return h;
}

export function PriorityOrbit({
  tickets,
  ariaLabel = 'نمودار مدار اولویت تیکت‌ها',
  className,
  onSelect,
  selectedId,
}: PriorityOrbitProps) {
  const palette = HUB_PALETTES.helpdesk;
  const accent = toOklch(palette.primary, 1, 58);
  const accentDeep = toOklch(palette.primary, 1, 45);
  const accentSoft = toOklch(palette.primary, 0.5, 58);

  // گروه‌بندی تیکت‌ها بر اساس priority
  const grouped = useMemo(() => {
    const g: Record<OrbitPriority, OrbitTicket[]> = {
      urgent: [],
      high: [],
      normal: [],
      low: [],
    };
    for (const t of tickets) g[t.priority]?.push(t);
    return g;
  }, [tickets]);

  // شمارنده‌ها
  const counts = useMemo(() => {
    const c: Record<OrbitPriority, number> = { urgent: 0, high: 0, normal: 0, low: 0 };
    for (const t of tickets) c[t.priority]++;
    return c;
  }, [tickets]);

  const openCount = useMemo(
    () => tickets.filter((t) => t.status !== 'closed' && t.status !== 'resolved').length,
    [tickets],
  );

  return (
    <div className={cn(s.orbit, className)} role="img" aria-label={ariaLabel}>
      <svg viewBox="0 0 100 100" className={s.svg} preserveAspectRatio="xMidYMid meet" aria-hidden>
        <defs>
          {/* هاله‌ی مرکزی */}
          <radialGradient id="po-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
            <stop offset="55%" stopColor={accent} stopOpacity="0.09" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>

          {/* درخشش هسته — گرادیان مورب برای حس شیشه */}
          <radialGradient id="po-core-disc" cx="35%" cy="28%" r="85%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
            <stop offset="55%" stopColor={toOklch(palette.primary, 0.85, 52)} stopOpacity="0.82" />
            <stop offset="100%" stopColor={accentDeep} stopOpacity="0.9" />
          </radialGradient>

          {/* محوکننده‌ی عمومی — برای هاله‌ها و نوارهای ابریشمی */}
          <filter id="po-blur" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.1" />
          </filter>
          <filter id="po-blur-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.5" />
          </filter>
        </defs>

        {/* ── هاله‌ی پس‌زمینه ─────────────────────────────── */}
        <circle cx="50" cy="50" r="48.5" fill="url(#po-core-glow)" />

        {/* ── نوارهای مداری — ابریشمی: لایه‌ی محو + خط ظریف ── */}
        {PRIORITY_ORDER.map((p) => {
          const tone = PRIORITY_TONE[p];
          const c = colorForTone(tone, 62);
          return (
            <g key={`lane-${p}`}>
              {/* باند شیشه‌ای محو */}
              <circle
                cx="50"
                cy="50"
                r={LANE_RADIUS[p]}
                fill="none"
                stroke={c}
                strokeOpacity="0.4"
                strokeWidth="1.1"
                filter="url(#po-blur)"
                vectorEffect="non-scaling-stroke"
              />
              {/* خط مرکزی ظریف */}
              <circle
                cx="50"
                cy="50"
                r={LANE_RADIUS[p]}
                fill="none"
                stroke={c}
                strokeOpacity="0.55"
                strokeWidth="0.14"
                vectorEffect="non-scaling-stroke"
              />
              {/* درخشش نقطه‌ای در ربع‌ها — حس الماس */}
              <g
                stroke={c}
                strokeOpacity="0.35"
                strokeWidth="0.16"
                vectorEffect="non-scaling-stroke"
              >
                <line x1="50" y1="0.5" x2="50" y2="3.5" />
                <line x1="50" y1="96.5" x2="50" y2="99.5" />
                <line x1="0.5" y1="50" x2="3.5" y2="50" />
                <line x1="96.5" y1="50" x2="99.5" y2="50" />
              </g>
            </g>
          );
        })}

        {/* ── سیاره‌ها (تیکت‌ها) — هر priority یک گروه چرخش آرام ── */}
        {PRIORITY_ORDER.map((p) => {
          const items = grouped[p];
          const tone = PRIORITY_TONE[p];
          const baseColor = colorForTone(tone, 58);
          const direction = p === 'urgent' || p === 'normal' ? 'normal' : 'reverse';
          return (
            <g
              key={`group-${p}`}
              className={s.orbitGroup}
              data-direction={direction}
              style={{ transformOrigin: '50% 50%' }}
            >
              {items.map((t, i) => {
                const pos = nodePos(i, items.length, LANE_RADIUS[p], hashSeed(t.id));
                const statusTone = STATUS_TONE[t.status];
                const statusColor = colorForTone(statusTone, 55);
                const isSelected = t.id === selectedId;
                return (
                  <g
                    key={t.id}
                    className={s.orbitNode}
                    data-selected={isSelected}
                    onClick={onSelect ? () => onSelect(t.id) : undefined}
                    role={onSelect ? 'button' : undefined}
                    tabIndex={onSelect ? 0 : undefined}
                    aria-label={t.subject}
                    onKeyDown={(e) => {
                      if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onSelect(t.id);
                      }
                    }}
                    style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                  >
                    {/* هاله‌ی نرم سیاره */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="2.9"
                      fill={baseColor}
                      fillOpacity="0.28"
                      filter="url(#po-blur-soft)"
                    />
                    {/* بدنه‌ی سیاره — گرادیان شعاعی */}
                    <circle cx={pos.x} cy={pos.y} r="1.7" fill={colorForTone(tone, 62)} />
                    <circle
                      cx={pos.x - 0.5}
                      cy={pos.y - 0.5}
                      r="1.7"
                      fill="none"
                      stroke={colorForTone(tone, 82)}
                      strokeOpacity="0.55"
                      strokeWidth="0.18"
                      vectorEffect="non-scaling-stroke"
                    />
                    {/* ماه — وضعیت تیکت */}
                    <circle
                      cx={pos.x + 1.15}
                      cy={pos.y - 1.15}
                      r="0.62"
                      fill={statusColor}
                      stroke="var(--ds-color-surface, white)"
                      strokeWidth="0.22"
                      vectorEffect="non-scaling-stroke"
                    />
                    {/* حلقه‌ی انتخاب — پالس نرم */}
                    {isSelected ? (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="2.2"
                        fill="none"
                        stroke={baseColor}
                        strokeWidth="0.3"
                        className={s.nodeRingPulse}
                        vectorEffect="non-scaling-stroke"
                      />
                    ) : null}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* ── هسته‌ی مرکزی — دیسک شیشه‌ای لایه‌ای ──────────── */}
        <g transform="translate(50 50)">
          {/* پالس بیرونی — درخشش برند */}
          <circle
            cx="0"
            cy="0"
            r="15"
            fill="url(#po-core-disc)"
            opacity="0.3"
            className={s.coreHalo}
          />
          {/* حلقه‌ی گرادیانی دور هسته */}
          <circle
            cx="0"
            cy="0"
            r="11.6"
            fill="none"
            stroke={accent}
            strokeOpacity="0.4"
            strokeWidth="0.5"
            filter="url(#po-blur-soft)"
            vectorEffect="non-scaling-stroke"
          />
          {/* دیسک اصلی شیشه‌ای */}
          <circle
            cx="0"
            cy="0"
            r="9.4"
            fill="var(--ds-color-surface, white)"
            stroke={accent}
            strokeOpacity="0.5"
            strokeWidth="0.4"
            vectorEffect="non-scaling-stroke"
          />
          {/* حلقه‌ی داخلی ظریف */}
          <circle
            cx="0"
            cy="0"
            r="7.4"
            fill="none"
            stroke={accent}
            strokeOpacity="0.18"
            strokeWidth="0.12"
            vectorEffect="non-scaling-stroke"
          />
          {/* تینت مرکزی — بدون هیچ علامت درهم */}
          <circle cx="0" cy="0" r="6.2" fill={accent} fillOpacity="0.08" />

          {/* نشانه‌های قطبی — سه نقطه‌ی ظریف (چپ/پایین/راست) */}
          <g fill={accentSoft} opacity="0.6">
            <circle cx="-7.4" cy="0" r="0.28" />
            <circle cx="0" cy="7.4" r="0.28" />
            <circle cx="7.4" cy="0" r="0.28" />
          </g>
          {/* بیکن بالایی — تنها عنصر زنده‌ی هسته */}
          <circle cx="0" cy="-7.4" r="0.6" fill={accent} className={s.beaconDot} />
          <circle
            cx="0"
            cy="-7.4"
            r="1.15"
            fill="none"
            stroke={accent}
            strokeOpacity="0.45"
            strokeWidth="0.14"
            className={s.beaconRing}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>

      {/* Overlay متن مرکز — خواندنی برای کاربر */}
      <div className={s.coreLabel} aria-hidden>
        <span className={s.coreValue}>{toPersianNumber(openCount)}</span>
        <span className={s.coreSub}>تیکت فعال</span>
      </div>

      {/* Legend overlay — در چهار گوشه */}
      <ul className={s.legend} aria-hidden>
        {PRIORITY_ORDER.map((p) => (
          <li key={p} className={s.legendItem} data-tone={p}>
            <span
              className={s.legendDot}
              style={{ background: colorForTone(PRIORITY_TONE[p], 60) }}
            />
            <span className={s.legendLabel}>{PRIORITY_LABEL[p]}</span>
            <span className={s.legendValue}>{toPersianNumber(counts[p])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function toPersianNumber(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}
