'use client';

/**
 * HeroSparkline — a single-stroke area+line SVG that fits any container.
 *
 * Computes everything from the data series without external dependencies so
 * it can be lazy-hydrated inside the HeroSection without a recharts
 * dependency. Stroke color is configurable so the same component powers the
 * emerald engagement line, the cyan hero line, etc.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface HeroSparklineProps {
  data: number[];
  /** CSS color string for the stroke + last-point dot. */
  stroke: string;
  className?: string;
  /** Pixel-perfect viewBox height (default 80). */
  height?: number;
}

export default function HeroSparkline({
  data,
  stroke,
  className,
  height = 80,
}: HeroSparklineProps) {
  const id = useId();
  const pathRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  // Mount-gated render flag: we paint at final state during SSR + first paint
  // and only kick off the rAF draw once the browser has actually committed the
  // path. Using rAF (not CSS keyframes) because getTotalLength() is only
  // meaningful after the path is in the DOM, and the dasharray must be set
  // from JS to be exact.
  const [drawn, setDrawn] = useState(false);
  const [fillShown, setFillShown] = useState(false);
  const w = 600;
  const h = height;
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const span = max - min || 1;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = h - 8 - ((v - min) / span) * (h - 16);
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const last = pts[pts.length - 1] ?? [0, 0];

  // Reveal animation: stroke draws in over 800ms (cubic-bezier(0.16, 1, 0.3, 1)),
  // then the fill polygon fades in over 800ms with a 200ms delay. Total ≈ 1s.
  // Reduced-motion users get the final state immediately.
  //
  // We use the SVG `pathLength={1}` attribute so the dashoffset values are
  // length-agnostic — that means the line can be hidden via inline style
  // during SSR (no flash of fully-drawn line before useEffect runs), and
  // getTotalLength() is never needed. The rAF chain eases the dashoffset
  // to 0 in the same 800ms window.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const path = pathRef.current;
    if (reduceMotion || !path) {
      setDrawn(true);
      setFillShown(true);
      return;
    }

    const start = performance.now();
    const easeOutExpo = (t: number) =>
      t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);

    let raf = 0;
    const tickLine = (now: number) => {
      const t = Math.min(1, (now - start) / 800);
      path.style.strokeDashoffset = String(1 - easeOutExpo(t));
      if (t < 1) {
        raf = requestAnimationFrame(tickLine);
      } else {
        setDrawn(true);
      }
    };
    raf = requestAnimationFrame(tickLine);

    const fillTimer = window.setTimeout(() => {
      const fill = fillRef.current;
      if (!fill) return;
      const startFill = performance.now();
      const tickFill = (now: number) => {
        const t = Math.min(1, (now - startFill) / 800);
        fill.style.opacity = String(easeOutExpo(t));
        if (t < 1) {
          raf = requestAnimationFrame(tickFill);
        } else {
          setFillShown(true);
        }
      };
      raf = requestAnimationFrame(tickFill);
    }, 200);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fillTimer);
    };
  }, [line]);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn('w-full h-full block', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.32} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        ref={fillRef}
        d={area}
        fill={`url(#grad-${id})`}
        style={{ opacity: fillShown ? undefined : 0 }}
      />
      <path
        ref={pathRef}
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        style={
          drawn
            ? undefined
            : { strokeDasharray: 1, strokeDashoffset: 1 }
        }
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r={4}
        fill={stroke}
        stroke="oklch(98% 0 0 / 0.85)"
        strokeWidth={2}
        style={drawn ? undefined : { opacity: 0 }}
      />
    </svg>
  );
}
