'use client';

import { useEffect, useRef } from 'react';

export type SpotlightTone = 'accent' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' | 'indigo';

export interface SpotlightProps {
  /** Accent hue of the light. Default 'accent' (teal). */
  tone?: SpotlightTone;
  /** Diameter of the light in px. Default 320. */
  size?: number;
  /** Peak opacity of the light (0–1). Default 1 (the CSS tone controls real alpha). */
  className?: string;
}

/**
 * Spotlight — a cursor-following radial light overlay (2026 premium pattern,
 * à la Vercel / Linear / Attio cards).
 *
 * Drop it as the FIRST child of any `position: relative; overflow: hidden`
 * container. It attaches a pointer listener to its `parentElement`, writes
 * the cursor position into `--spot-x` / `--spot-y` CSS variables, and the
 * `.tide-spotlight` rule in dashboard.css paints the light. It is purely
 * decorative (`aria-hidden`), GPU-friendly (opacity/position only), and
 * fully disabled under `prefers-reduced-motion`.
 */
export function Spotlight({ tone = 'accent', size = 320, className }: SpotlightProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame: number | null = null;

    const onMove = (e: PointerEvent) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = parent.getBoundingClientRect();
        el.style.setProperty('--spot-x', `${(e.clientX - rect.left).toFixed(1)}px`);
        el.style.setProperty('--spot-y', `${(e.clientY - rect.top).toFixed(1)}px`);
        el.style.setProperty('--spot-op', '1');
      });
    };
    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = null;
      el.style.setProperty('--spot-op', '0');
    };

    parent.addEventListener('pointermove', onMove);
    parent.addEventListener('pointerleave', onLeave);
    return () => {
      parent.removeEventListener('pointermove', onMove);
      parent.removeEventListener('pointerleave', onLeave);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden
      className={`tide-spotlight${className ? ` ${className}` : ''}`}
      data-tone={tone}
      style={{ '--spot-size': `${size}px` } as React.CSSProperties}
    />
  );
}
