'use client';

/**
 * InsightPanel — contextual side rail for the redesigned dashboards.
 *
 * Architecture: every list console gets a main `DataPanel` + an insight
 * rail (`InsightPanel`) so the page has a hierarchy — the table is the
 * hero, the rail holds "at a glance" analytics derived from the same data.
 *
 * Composition:
 *   <InsightLayout
 *     main={<DataPanel …/>}
 *     aside={
 *       <InsightPanel>
 *         <InsightCard title="…">
 *           <Donut data={…} />
 *           <BarList data={…} />
 *         </InsightCard>
 *       </InsightPanel>
 *     }
 *   />
 *
 * On desktop the rail sits on the inline-end and sticks while the table
 * scrolls; on mobile it stacks below the table. Colors are the semantic
 * categorical palette (--nova-*) — same everywhere, never page-specific.
 */

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import s from './InsightPanel.module.css';

/* ── Colors ─────────────────────────────────────────────────────────── */

export type InsightColor = 'cyan' | 'emerald' | 'violet' | 'amber' | 'rose' | 'indigo' | 'slate';

const COLOR_VAR: Record<InsightColor, string> = {
  cyan: 'var(--nova-cyan, var(--ds-accent-cyan))',
  emerald: 'var(--nova-emerald, var(--ds-accent-emerald))',
  violet: 'var(--nova-violet, var(--ds-accent-violet))',
  amber: 'var(--nova-amber, var(--ds-accent-amber))',
  rose: 'var(--nova-rose, var(--ds-accent-rose))',
  indigo: 'var(--nova-primary, var(--ds-accent-indigo))',
  slate: 'var(--nova-muted, var(--ds-accent-slate))',
};

/* ── Layout ─────────────────────────────────────────────────────────── */

export interface InsightLayoutProps {
  main: ReactNode;
  aside: ReactNode;
  className?: string;
}

export function InsightLayout({ main, aside, className }: InsightLayoutProps) {
  return (
    <div className={cn(s.layout, className)}>
      <div className={s.main}>{main}</div>
      <div className={s.aside}>{aside}</div>
    </div>
  );
}

/* ── Panel / Card ───────────────────────────────────────────────────── */

export interface InsightPanelProps {
  children: ReactNode;
  className?: string;
}

export function InsightPanel({ children, className }: InsightPanelProps) {
  return <aside className={cn(s.panel, className)}>{children}</aside>;
}

export interface InsightCardProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

export function InsightCard({ title, icon: Icon, children, className }: InsightCardProps) {
  return (
    <section className={cn(s.card, className)}>
      <header className={s.cardHead}>
        {Icon && (
          <span className={s.cardIcon} aria-hidden>
            <Icon size={14} strokeWidth={1.75} />
          </span>
        )}
        <h3 className={s.cardTitle}>{title}</h3>
      </header>
      <div className={s.cardBody}>{children}</div>
    </section>
  );
}

/* ── Donut ──────────────────────────────────────────────────────────── */

export interface DonutSegment {
  label: string;
  value: number;
  color: InsightColor;
}

export interface DonutProps {
  data: DonutSegment[];
  /** Chart diameter in px — default 128 */
  size?: number;
  /** Ring thickness in px — default 13 */
  thickness?: number;
  /** Center caption (usually "مجموع") */
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}

export function Donut({
  data,
  size = 128,
  thickness = 13,
  centerLabel,
  centerValue,
  className,
}: DonutProps) {
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);

  let acc = 0;
  const stops = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const start = (acc / total) * 360;
      acc += d.value;
      const end = (acc / total) * 360;
      return `${COLOR_VAR[d.color]} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
    });

  const ringStyle =
    stops.length > 0 ? { background: `conic-gradient(${stops.join(', ')})` } : undefined;

  return (
    <div className={cn(s.donutWrap, className)}>
      <div
        className={s.donut}
        style={{
          width: size,
          height: size,
          ['--donut-thickness' as string]: `${thickness}px`,
          ...ringStyle,
        }}
        role="img"
        aria-label={
          data.length > 0
            ? data.map((d) => `${d.label}: ${d.value}`).join('، ')
            : 'داده‌ای موجود نیست'
        }
      >
        {total > 0 ? (
          <div className={s.donutCenter}>
            {centerValue !== undefined && <span className={s.donutValue}>{centerValue}</span>}
            {centerLabel && <span className={s.donutLabel}>{centerLabel}</span>}
          </div>
        ) : (
          <span className={s.donutEmpty}>—</span>
        )}
      </div>

      {data.length > 0 && (
        <ul className={s.legend}>
          {data.map((d) => (
            <li key={d.label} className={s.legendRow}>
              <span
                className={s.legendDot}
                style={{ background: COLOR_VAR[d.color] }}
                aria-hidden
              />
              <span className={s.legendLabel}>{d.label}</span>
              <span className={s.legendValue}>{d.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Split bar (distribution) ──────────────────────────────────────── */

export interface SplitBarSegment {
  label: string;
  value: number;
  color: InsightColor;
}

export interface SplitBarProps {
  data: SplitBarSegment[];
  /** Optional format for values (default: fa-IR digits) */
  format?: (value: number) => string;
  className?: string;
}

export function SplitBar({ data, format = (v) => faNum.format(v), className }: SplitBarProps) {
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);
  if (total <= 0) return null;

  let acc = 0;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const start = (acc / total) * 100;
      acc += d.value;
      const end = (acc / total) * 100;
      return { ...d, width: `${end - start}%`, offset: `${start}%` };
    });

  return (
    <div className={cn(s.splitWrap, className)}>
      <div
        className={s.splitTrack}
        role="img"
        aria-label={data.map((d) => `${d.label}: ${d.value}`).join('، ')}
      >
        {segments.map((seg) => (
          <span
            key={seg.label}
            className={s.splitSeg}
            style={{
              width: seg.width,
              insetInlineStart: seg.offset,
              background: COLOR_VAR[seg.color],
            }}
          />
        ))}
      </div>
      <ul className={s.splitLegend}>
        {data.map((d) => (
          <li key={d.label} className={s.splitRow}>
            <span className={s.splitDot} style={{ background: COLOR_VAR[d.color] }} aria-hidden />
            <span className={s.splitLabel}>{d.label}</span>
            <span className={s.splitValue}>{format(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Bar list ───────────────────────────────────────────────────────── */

export interface BarItem {
  label: string;
  value: number;
  hint?: string;
  color?: InsightColor;
}

export interface BarListProps {
  data: BarItem[];
  /** Optional format for values (default: fa-IR digits) */
  format?: (value: number) => string;
  className?: string;
  /** Show relative share beside each row */
  showShare?: boolean;
}

const faNum = new Intl.NumberFormat('fa-IR');

export function BarList({
  data,
  format = (v) => faNum.format(v),
  className,
  showShare = false,
}: BarListProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);

  return (
    <ul className={cn(s.barList, className)}>
      {data.map((d) => {
        const share = total > 0 ? Math.round((d.value / total) * 100) : 0;
        return (
          <li key={d.label} className={s.barRow}>
            <div className={s.barTop}>
              <span className={s.barLabel} title={d.label}>
                {d.label}
              </span>
              <span className={s.barMeta}>
                {showShare && share > 0 && (
                  <span className={s.barShare}>{faNum.format(share)}٪</span>
                )}
                <span className={s.barValue}>{format(d.value)}</span>
              </span>
            </div>
            <div className={s.barTrack}>
              <div
                className={s.barFill}
                style={{
                  width: `${(d.value / max) * 100}%`,
                  background: d.color ? COLOR_VAR[d.color] : undefined,
                }}
              />
            </div>
            {d.hint && <span className={s.barHint}>{d.hint}</span>}
          </li>
        );
      })}
    </ul>
  );
}
