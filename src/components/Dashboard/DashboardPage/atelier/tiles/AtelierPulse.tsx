'use client';

/**
 * AtelierPulse — animated radial chart for the hero.
 *
 * A circular SVG with two layered arcs (track + progress) plus a small
 * "today vs total" indicator. The progress arc animates from 0 to its
 * target on mount via stroke-dashoffset. Subtle tick marks on the
 * outside give it a gauge/instrument feel without being heavy.
 *
 * Self-contained: no chart library, no external deps.
 */

import { useEffect, useId, useRef } from 'react';

interface AtelierPulseProps {
  /** Current value (e.g. today's views). */
  value: number;
  /** Max value used as the 100% reference (e.g. total views). */
  max: number;
  /** Accessible label for screen readers. */
  label: string;
}

const SIZE = 200;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2 - 6;
const CIRC = 2 * Math.PI * RADIUS;

export default function AtelierPulse({ value, max, label }: AtelierPulseProps) {
  const gradId = useId();
  const progressRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<SVGCircleElement>(null);

  const safeMax = Math.max(1, max);
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  const targetOffset = CIRC * (1 - ratio);

  useEffect(() => {
    const el = progressRef.current;
    if (!el) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.strokeDashoffset = String(targetOffset);
      return;
    }
    el.style.strokeDashoffset = String(CIRC);
    const duration = 1400;
    let start: number | null = null;
    let raf = 0;
    const ease = (t: number) => 1 - 2 ** (-10 * t);
    const step = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      el.style.strokeDashoffset = String(CIRC * (1 - ease(t) * ratio));
      if (t < 1) raf = window.requestAnimationFrame(step);
    };
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [ratio, targetOffset]);

  // Build tick marks
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
    const inner = RADIUS + 4;
    const outer = RADIUS + (i % 5 === 0 ? 10 : 6);
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const x1 = cx + Math.cos(angle) * inner;
    const y1 = cy + Math.sin(angle) * inner;
    const x2 = cx + Math.cos(angle) * outer;
    const y2 = cy + Math.sin(angle) * outer;
    return { x1, y1, x2, y2, major: i % 5 === 0 };
  });

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="at-pulse"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--at-accent)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--at-gold)" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Tick marks */}
      <g aria-hidden>
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="currentColor"
            strokeWidth={t.major ? 1.4 : 0.7}
            strokeLinecap="round"
            opacity={t.major ? 0.45 : 0.18}
          />
        ))}
      </g>

      {/* Track */}
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        opacity="0.15"
      />

      {/* Progress */}
      <circle
        ref={progressRef}
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={CIRC}
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        className="at-pulse__progress"
      />

      {/* Center dot */}
      <circle
        ref={numRef}
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={3}
        fill="var(--at-accent)"
        className="at-pulse__dot"
      />
    </svg>
  );
}
