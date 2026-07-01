'use client';

/**
 * GeometricAccent — floating punctuation primitives for the Atlas composition.
 *
 * A painter's composition is never empty: the negative space itself is part
 * of the design. This component renders small, intentional geometric marks
 * — quarter-circles, hairlines, dots — positioned at Fibonacci ratios
 * (0.382 / 0.5 / 0.618) so the empty zones between cards read as
 * "designed" rather than "leftover".
 *
 * Every primitive is decorative (aria-hidden), GPU-accelerated, and
 * respects prefers-reduced-motion via the CSS keyframes.
 *
 * Variants:
 *   • 'qtr'      — radial quarter-circle (corner punctuation)
 *   • 'diag'     — diagonal hairline at -7.5°
 *   • 'dot'      — accent dot with concentric glow (animated pulse)
 *   • 'vrule'    — vertical hairline, fades at top/bottom
 *   • 'cross'    — minimal '+' mark for column-edge anchors
 *
 * Multiple primitives can be composed; they live inside an absolutely-
 * positioned layer (`.dash-atlas__geo`) that does not interfere with the
 * parent flow.
 */

import { cn } from '@/lib/utils';

export type GeometricAccentVariant = 'qtr' | 'diag' | 'dot' | 'vrule' | 'cross';

export interface GeometricAccentProps {
  variant: GeometricAccentVariant;
  /**
   * Position in the parent. Anchor keywords follow Tailwind's absolute
   * utility names: 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r' | 'c'.
   * Default: 'tl'. Pixels offset via `offset` prop (Fibonacci default 21px).
   */
  position?: 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r' | 'c';
  /** Offset in pixels from the chosen anchor edge (Fibonacci default). */
  offset?: number;
  className?: string;
  /** Forwarded to the root element (rarely used; reserved for testing). */
  style?: React.CSSProperties;
}

const VARIANT_CLASS: Record<GeometricAccentVariant, string> = {
  qtr: 'dash-atlas__geo--qtr',
  diag: 'dash-atlas__geo--diag',
  dot: 'dash-atlas__geo--dot',
  vrule: 'dash-atlas__geo--vrule',
  cross: 'dash-atlas__geo--cross',
};

const POSITION_STYLE: Record<NonNullable<GeometricAccentProps['position']>, React.CSSProperties> = {
  tl: { insetBlockStart: 0, insetInlineStart: 0 },
  tr: { insetBlockStart: 0, insetInlineEnd: 0 },
  bl: { insetBlockEnd: 0, insetInlineStart: 0 },
  br: { insetBlockEnd: 0, insetInlineEnd: 0 },
  t: { insetBlockStart: 0, insetInline: '38.2%' },
  b: { insetBlockEnd: 0, insetInline: '38.2%' },
  l: { insetInlineStart: 0, insetBlock: '38.2%' },
  r: { insetInlineEnd: 0, insetBlock: '38.2%' },
  c: { insetBlockStart: '50%', insetInlineStart: '50%', transform: 'translate(-50%, -50%)' },
};

export function GeometricAccent({
  variant,
  position = 'tl',
  offset = 21,
  className,
  style,
}: GeometricAccentProps) {
  const baseStyle = POSITION_STYLE[position];
  // Apply offset by mutating the relevant edge property
  const offsetStyle: React.CSSProperties = { ...baseStyle };
  if (offset > 0) {
    const f = `${offset}px`;
    if (position === 'tl' || position === 'tr' || position === 't') {
      offsetStyle.insetBlockStart = f;
    }
    if (position === 'bl' || position === 'br' || position === 'b') {
      offsetStyle.insetBlockEnd = f;
    }
    if (position === 'tl' || position === 'bl' || position === 'l') {
      offsetStyle.insetInlineStart = f;
    }
    if (position === 'tr' || position === 'br' || position === 'r') {
      offsetStyle.insetInlineEnd = f;
    }
  }

  if (variant === 'cross') {
    // Minimal '+' mark — inline SVG, not CSS-based, so it doesn't compete
    // with the existing .dash-atlas__geo--* utilities.
    return (
      <svg
        aria-hidden="true"
        className={cn('dash-atlas__geo', className)}
        style={{ ...offsetStyle, ...style }}
        width="12"
        height="12"
        viewBox="0 0 12 12"
      >
        <path
          d="M6 1 V11 M1 6 H11"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn('dash-atlas__geo', VARIANT_CLASS[variant], className)}
      style={{ ...offsetStyle, ...style }}
    />
  );
}

/**
 * GeometricField — convenience composition that renders a curated set of
 * primitives spread across the parent (typically the hero main or the
 * vitruvian centerpiece). The exact positions are tuned so they read as
 * punctuation, not noise.
 *
 * Pass `density` to control how many marks appear:
 *   • 'min'  — single dot at 0.618
 *   • 'med'  — qtr + dot + vrule (default)
 *   • 'rich' — qtr + diag + dot + vrule + cross
 */
export interface GeometricFieldProps {
  density?: 'min' | 'med' | 'rich';
  className?: string;
}

export function GeometricField({ density = 'med', className }: GeometricFieldProps) {
  if (density === 'min') {
    return (
      <div className={cn('absolute inset-0 pointer-events-none', className)} aria-hidden>
        <GeometricAccent variant="dot" position="bl" offset={34} />
      </div>
    );
  }
  if (density === 'rich') {
    return (
      <div className={cn('absolute inset-0 pointer-events-none', className)} aria-hidden>
        <GeometricAccent variant="qtr" position="tl" offset={0} />
        <GeometricAccent variant="diag" position="tr" offset={0} />
        <GeometricAccent variant="dot" position="bl" offset={34} />
        <GeometricAccent variant="vrule" position="r" offset={0} />
        <GeometricAccent variant="cross" position="c" offset={0} />
      </div>
    );
  }
  return (
    <div className={cn('absolute inset-0 pointer-events-none', className)} aria-hidden>
      <GeometricAccent variant="qtr" position="tl" offset={0} />
      <GeometricAccent variant="dot" position="bl" offset={26} />
      <GeometricAccent variant="vrule" position="r" offset={0} />
    </div>
  );
}
