'use client';

/**
 * DashboardEmpty — premium empty state primitive (June 25 redesign).
 *
 * Replaces the plain "icon + label" placeholders that ship by default
 * across the dashboard (ActivityRail, EngagementDonut, PostsSpotlight,
 * ScheduledRail, etc.) with a refined surface:
 *
 *   • A colored icon block on a soft tinted background (per tone).
 *   • A faint dot-grid SVG pattern behind the content — gives the
 *     empty state the same "depth" the populated panes have.
 *   • A bold title + a softer description, max-width capped.
 *   • An optional CTA (Link or button).
 *
 * Accessibility:
 *   • role="status" so screen readers announce the placeholder.
 *   • Decorative SVG pattern is aria-hidden.
 *   • Icon block is aria-hidden so the title is the source of truth.
 *
 * The dot pattern is generated with stable IDs so React's reconciliation
 * doesn't churn them on re-render.
 */

import { useId } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export type DashboardEmptyTone =
  | 'violet'
  | 'cyan'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'slate';

export interface DashboardEmptyProps {
  /** Decorative icon shown inside the tinted icon block. */
  icon: React.ReactNode;
  /** Short headline shown beneath the icon. */
  title: string;
  /** Optional second line of copy. */
  description?: string;
  /** Accent tone; defaults to violet. */
  tone?: DashboardEmptyTone;
  /** Optional call-to-action. Provide `href` for a link or `onClick` for a button. */
  cta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  /** Visual density. */
  size?: 'sm' | 'md' | 'lg';
}

interface SizeSpec {
  container: string;
  iconBox: string;
  iconInner: string;
  title: string;
  desc: string;
  cta: string;
}

const SIZE_SPEC: Record<NonNullable<DashboardEmptyProps['size']>, SizeSpec> = {
  sm: {
    container: 'py-8 gap-2.5',
    iconBox: 'w-10 h-10',
    iconInner: 'w-4 h-4',
    title: 'text-sm',
    desc: 'text-xs',
    cta: 'h-8 text-xs px-3',
  },
  md: {
    container: 'py-12 gap-3',
    iconBox: 'w-14 h-14',
    iconInner: 'w-6 h-6',
    title: 'text-base',
    desc: 'text-sm',
    cta: 'h-9 text-sm px-4',
  },
  lg: {
    container: 'py-16 gap-4',
    iconBox: 'w-16 h-16',
    iconInner: 'w-7 h-7',
    title: 'text-lg',
    desc: 'text-base',
    cta: 'h-10 text-sm px-5',
  },
};

/**
 * Tinted color tokens for each tone. We use oklch to stay consistent with
 * the dashboard's color language and the .dark <html> token swap handles
 * light/dark automatically for the text-only variants below.
 */
const TONE_TINT: Record<
  DashboardEmptyTone,
  { blockBg: string; blockFg: string; dotFg: string }
> = {
  violet: {
    blockBg: 'bg-violet-500/10 dark:bg-violet-500/15',
    blockFg: 'text-violet-600 dark:text-violet-400',
    dotFg: 'fill-violet-500/30 dark:fill-violet-400/20',
  },
  cyan: {
    blockBg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    blockFg: 'text-cyan-600 dark:text-cyan-400',
    dotFg: 'fill-cyan-500/30 dark:fill-cyan-400/20',
  },
  emerald: {
    blockBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    blockFg: 'text-emerald-600 dark:text-emerald-400',
    dotFg: 'fill-emerald-500/30 dark:fill-emerald-400/20',
  },
  amber: {
    blockBg: 'bg-amber-500/10 dark:bg-amber-500/15',
    blockFg: 'text-amber-600 dark:text-amber-400',
    dotFg: 'fill-amber-500/30 dark:fill-amber-400/20',
  },
  rose: {
    blockBg: 'bg-rose-500/10 dark:bg-rose-500/15',
    blockFg: 'text-rose-600 dark:text-rose-400',
    dotFg: 'fill-rose-500/30 dark:fill-rose-400/20',
  },
  slate: {
    blockBg: 'bg-slate-500/10 dark:bg-slate-400/10',
    blockFg: 'text-slate-600 dark:text-slate-300',
    dotFg: 'fill-slate-500/30 dark:fill-slate-400/20',
  },
};

export function DashboardEmpty({
  icon,
  title,
  description,
  tone = 'violet',
  cta,
  size = 'md',
}: DashboardEmptyProps) {
  const patternId = useId();
  const tint = TONE_TINT[tone];
  const spec = SIZE_SPEC[size];

  const ctaCls = cn(
    'inline-flex items-center gap-1.5 rounded-lg font-semibold mt-1',
    'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100',
    'transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60',
    spec.cta,
  );

  return (
    <div
      className={cn(
        'relative isolate flex flex-col items-center justify-center text-center overflow-hidden rounded-2xl',
        spec.container,
      )}
      role="status"
      aria-live="polite"
    >
      {/* Dot-grid pattern — gives the empty state the same depth the */}
      {/* populated panes have. Stable id so React doesn't re-render the SVG. */}
      <svg
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none opacity-70"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern
            id={patternId}
            x="0"
            y="0"
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1.2" cy="1.2" r="0.9" className={tint.dotFg} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      <span
        className={cn(
          'inline-flex items-center justify-center rounded-2xl ring-1 ring-inset',
          'ring-black/[0.04] dark:ring-white/[0.06]',
          spec.iconBox,
          tint.blockBg,
          tint.blockFg,
        )}
        aria-hidden
      >
        <span className={spec.iconInner}>{icon}</span>
      </span>

      <div className="space-y-1.5 max-w-xs">
        <p
          className={cn(
            'font-extrabold text-slate-900 dark:text-white tracking-tight',
            spec.title,
          )}
        >
          {title}
        </p>
        {description && (
          <p
            className={cn(
              'text-slate-500 dark:text-slate-400 leading-relaxed',
              spec.desc,
            )}
          >
            {description}
          </p>
        )}
      </div>

      {cta &&
        (cta.href ? (
          <Link href={cta.href} className={ctaCls}>
            {cta.label}
          </Link>
        ) : (
          <button type="button" onClick={cta.onClick} className={ctaCls}>
            {cta.label}
          </button>
        ))}
    </div>
  );
}
