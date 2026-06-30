'use client';

import * as React from 'react';

/**
 * ConfettiBurst — CSS-only, zero-JS, zero-dependency celebration animation.
 *
 * Renders 28 deterministic particles whose position, colour, and animation
 * delay are baked in via `index` so the SSR markup is stable across renders
 * (no hydration mismatch).
 *
 * Honours `prefers-reduced-motion` via CSS (see `setup.css`) — when the user
 * has motion reduced, the particles stay hidden. The wrapping success seal
 * itself remains visible.
 *
 * Why not a library: the entire effect is one CSS keyframe and 28 inline
 * spans, total cost < 0.5KB compressed. Adding `canvas-confetti` (~12KB) for
 * this one screen is not justified.
 */

export interface ConfettiBurstProps {
  /** Number of particles to emit. Capped at 64 for performance. */
  count?: number;
}

const PALETTE = [
  'oklch(70% 0.16 270)', // violet
  'oklch(72% 0.14 200)', // cyan
  'oklch(75% 0.18 350)', // pink
  'oklch(78% 0.15 90)', // gold
  'oklch(68% 0.14 165)', // teal
] as const;

const SHAPES = ['square', 'bar', 'circle'] as const;

function deterministicConfig(index: number) {
  // Pure-math pseudo-randomisation (Mulberry32 light) so SSR + CSR agree.
  const x = (index * 9301 + 49297) % 233280;
  const seed = x / 233280;
  const seed2 = (((index + 7) * 9301 + 49297) % 233280) / 233280;
  const seed3 = (((index + 13) * 2731 + 12345) % 233280) / 233280;
  const seed4 = (((index + 19) * 4327 + 99991) % 233280) / 233280;
  return { seed, seed2, seed3, seed4 };
}

export function ConfettiBurst({ count = 36 }: ConfettiBurstProps) {
  const safeCount = Math.min(64, Math.max(8, count));
  const particles = React.useMemo(
    () =>
      Array.from({ length: safeCount }, (_, i) => {
        const { seed, seed2, seed3, seed4 } = deterministicConfig(i);
        const colorIdx = Math.floor(seed * PALETTE.length) % PALETTE.length;
        const shapeIdx = Math.floor(seed2 * SHAPES.length) % SHAPES.length;
        const horizontalDrift = (seed - 0.5) * 240; // -120..120
        const delay = seed3 * 600; // 0..600ms
        const duration = 1400 + seed4 * 1400; // 1.4..2.8s
        const size = 6 + seed2 * 8; // 6..14px
        return {
          color: PALETTE[colorIdx],
          shape: SHAPES[shapeIdx],
          horizontalDrift,
          delay,
          duration,
          size,
        };
      }),
    [safeCount],
  );

  return (
    <div className="setup-confetti" aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          className={`setup-confetti__piece setup-confetti__piece--${p.shape}`}
          style={
            {
              '--confetti-x': `${p.horizontalDrift}px`,
              '--confetti-delay': `${p.delay}ms`,
              '--confetti-duration': `${p.duration}ms`,
              '--confetti-size': `${p.size}px`,
              '--confetti-color': p.color,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
