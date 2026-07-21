'use client';

/**
 * CountUp — animated numeric reveal.
 *
 * Linear / Vercel / Stripe pattern: when a numeric KPI changes or
 * mounts, the digits smoothly tween from the previous value to the new
 * one with a single, calm ease. The component:
 *   • Uses requestAnimationFrame so it pauses on tab-switch and runs at
 *     the display refresh rate
 *   • Honors `prefers-reduced-motion` (jumps to the target value)
 *   • Animates once on mount; for "value" updates after mount it tweens
 *     from the previous value (smooth KPI refresh on data refetch)
 *   • Uses `Intl.NumberFormat('fa-IR')` for Persian digits
 *
 * Accessibility:
 *   • Renders an `<output>` so screen readers announce the value as it
 *     updates
 *   • Has aria-live="polite" so the final value is read without
 *     interrupting other speech
 */

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  value: number;
  /** Animation duration in ms. Default 900. */
  duration?: number;
  /** Decimal places (Persian locale). */
  decimals?: number;
  /** Locale for number formatting. */
  locale?: string;
  className?: string;
  /** Use a tabular-nums rendering to keep digits from jittering. */
  tabular?: boolean;
}

const easeOutQuart = (t: number) => 1 - (1 - t) ** 4;

export default function CountUp({
  value,
  duration = 900,
  decimals = 0,
  locale = 'fa-IR',
  className,
  tabular = true,
}: CountUpProps) {
  const [display, setDisplay] = useState<number>(value);
  const fromRef = useRef<number>(value);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const reducedMotion = useRef<boolean>(false);

  // Honor prefers-reduced-motion at mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (reducedMotion.current) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }

    fromRef.current = display;
    startRef.current = null;

    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutQuart(t);
      const next = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = window.requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = window.requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [value, duration]);

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.round(display * 10 ** decimals) / 10 ** decimals);

  return (
    <output
      aria-live="polite"
      className={className}
      style={tabular ? { fontVariantNumeric: 'tabular-nums' } : undefined}
    >
      {formatted}
    </output>
  );
}
