'use client';

/**
 * PriorityOrbit — signature visual برای مرکز تیکت‌ها.
 * ---------------------------------------------------------------------------
 *  متافور: یک «مرکز فرماندهی» دایره‌ای. چهار مدار هم‌مرکز، هر کدام متعلق به
 *  یک سطح اولویت (urgent / high / normal / low). تیکت‌های واقعی به‌صورت
 *  نقطه‌هایی روی این مدارها قرار می‌گیرند و آرام به دور مرکز می‌چرخند.
 *  درون دیسک مرکزی، شمارنده‌ی تیکت‌های باز + یک live dot نفس می‌کشد.
 *
 *  - token-based: تمام رنگ‌ها از --ds-* / oklch پالت hub
 *  - RTL-correct: فقط logical props، زاویه‌ها viewport-relative
 *  - 60fps: فقط transform / opacity، reduced-motion توسط global clamp مهار می‌شود
 *  - interactive: hover روی هر node، node highlight + label
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { HUB_PALETTES, toOklch } from '@/components/Dashboard/PlatformHub/HubPalette';
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
  urgent: 22,   // نزدیک‌ترین — بحرانی‌ترین
  high: 30,
  normal: 38,
  low: 46,      // دورترین — کم‌اهمیت‌ترین
};

const LANE_DASH: Record<OrbitPriority, string> = {
  urgent: '1.4 1.4',
  high: '1 1.4',
  normal: '0.6 1.4',
  low: '0.4 1.4',
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
    angle,
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
          <radialGradient id="orbit-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.18" />
            <stop offset="55%" stopColor={accent} stopOpacity="0.08" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="orbit-core-disc" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colorForTone('rose', 75)} stopOpacity="0.95" />
            <stop offset="100%" stopColor={colorForTone('rose', 45)} stopOpacity="0.85" />
          </radialGradient>
          <filter id="orbit-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="0.5" />
          </filter>
        </defs>

        {/* هاله پس‌زمینه */}
        <circle cx="50" cy="50" r="48" fill="url(#orbit-core)" />

        {/* مدارها — هر کدام با tone اختصاصی */}
        {PRIORITY_ORDER.map((p) => {
          const tone = PRIORITY_TONE[p];
          const c = colorForTone(tone, 65);
          return (
            <g key={`lane-${p}`}>
              <circle
                cx="50"
                cy="50"
                r={LANE_RADIUS[p]}
                fill="none"
                stroke={c}
                strokeOpacity="0.18"
                strokeWidth="0.18"
                strokeDasharray={LANE_DASH[p]}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx="50"
                cy="50"
                r={LANE_RADIUS[p]}
                fill="none"
                stroke={c}
                strokeOpacity="0.05"
                strokeWidth="1.2"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}

        {/* خطوط راهنما از مرکز (cross-hair) */}
        <g stroke={accentSoft} strokeOpacity="0.18" strokeWidth="0.12" strokeDasharray="0.6 1.2" vectorEffect="non-scaling-stroke">
          <line x1="50" y1="2" x2="50" y2="98" />
          <line x1="2" y1="50" x2="98" y2="50" />
        </g>

        {/* node ها (تیکت‌ها) — هر priority یک گروه چرخش آرام */}
        {PRIORITY_ORDER.map((p) => {
          const items = grouped[p];
          const tone = PRIORITY_TONE[p];
          const baseColor = colorForTone(tone, 60);
          const baseColorDim = colorForTone(tone, 35);
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
                    {/* halo outer */}
                    <circle cx={pos.x} cy={pos.y} r="2.4" fill={baseColor} fillOpacity="0.18" />
                    {/* ring */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="1.5"
                      fill="var(--ds-color-surface, white)"
                      stroke={baseColor}
                      strokeWidth="0.4"
                    />
                    {/* status inner dot */}
                    <circle cx={pos.x} cy={pos.y} r="0.8" fill={statusColor} />
                    {/* selected ring */}
                    {isSelected ? (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="2.6"
                        fill="none"
                        stroke={baseColor}
                        strokeWidth="0.3"
                        strokeOpacity="0.7"
                      />
                    ) : null}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* دیسک مرکز — اولویت بحرانی */}
        <g transform="translate(50 50)">
          {/* outer halo (pulse) */}
          <circle cx="0" cy="0" r="14" fill="url(#orbit-core-disc)" opacity="0.35" className={s.coreHalo} />
          {/* middle disc */}
          <circle
            cx="0"
            cy="0"
            r="9.5"
            fill="var(--ds-color-surface, white)"
            stroke={colorForTone('rose', 55)}
            strokeWidth="0.5"
          />
          {/* inner accent disc */}
          <circle
            cx="0"
            cy="0"
            r="6.5"
            fill={colorForTone('rose', 55)}
            fillOpacity="0.12"
          />
          {/* central mark — مثل یک آنتن/برج فرماندهی */}
          <g stroke={colorForTone('rose', 45)} strokeWidth="0.55" strokeLinecap="round" fill="none">
            <path d="M -3 4 L 3 4 L 0 -5 Z" />
            <line x1="-2.2" y1="0" x2="2.2" y2="0" />
            <line x1="-2.6" y1="2" x2="2.6" y2="2" />
            <line x1="0" y1="-5" x2="0" y2="-8" />
            <circle cx="0" cy="-8" r="0.8" fill={colorForTone('rose', 45)} />
            <path d="M -1.6 -8.6 Q 0 -10.2 1.6 -8.6" opacity="0.6" />
            <path d="M -2.6 -9.6 Q 0 -12.2 2.6 -9.6" opacity="0.35" />
          </g>
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
            <span className={s.legendDot} style={{ background: colorForTone(PRIORITY_TONE[p], 60) }} />
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
