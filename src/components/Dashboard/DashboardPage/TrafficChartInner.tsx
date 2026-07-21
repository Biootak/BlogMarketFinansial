'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// recharts margin uses SVG axis keys — intentional, not CSS physical props
const CHART_MARGIN = { top: 20, right: 10, left: -10, bottom: 5 };

interface InnerChartProps {
  data: Array<Record<string, unknown>>;
  tooltip: React.ReactElement;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - 2 ** (-10 * t);
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

interface AnimatedRectProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  fill?: string;
  radius?: number | Array<number>;
  [key: string]: unknown;
}

const AnimatedRect: React.FC<AnimatedRectProps> = (props) => {
  const { x = 0, y = 0, width = 0, height = 0, index = 0, fill } = props;
  const ref = useRef<SVGRectElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced || !ref.current || height <= 0) return undefined;

    const rect = ref.current;
    rect.style.transformOrigin = 'bottom';
    rect.style.transformBox = 'fill-box';
    rect.style.transform = 'scaleY(0)';

    const delay = index * 20;
    const duration = 500;
    const start = performance.now() + delay;
    let rafId = 0;

    const step = (now: number) => {
      const elapsed = now - start;
      if (elapsed < 0) {
        rafId = requestAnimationFrame(step);
        return;
      }
      const t = Math.min(1, elapsed / duration);
      const scale = easeOutExpo(t);
      rect.style.transform = `scaleY(${scale})`;
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [reduced, index, height]);

  const style: CSSProperties = reduced
    ? {}
    : { transformOrigin: 'bottom', transformBox: 'fill-box', transform: 'scaleY(0)' };

  // Recharts shape props include non-SVG fields like dataKey/payload/name/value.
  // Spreading them onto <rect> causes React "unknown prop" warnings; we whitelist
  // only the SVG-valid ones (fill). Radius (corner rounding) is omitted on purpose —
  // raw <rect> doesn't support Recharts' array radius; use rx/ry if needed.
  return <rect ref={ref} x={x} y={y} width={width} height={height} fill={fill} style={style} />;
};

const TrafficChartInner: React.FC<InnerChartProps> = ({ data, tooltip }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced || !wrapperRef.current) return undefined;

    const svg = wrapperRef.current.querySelector('svg');
    if (!svg) return undefined;

    const paths = Array.from(svg.querySelectorAll('path'));
    const controllers: Array<() => void> = [];

    paths.forEach((path, i) => {
      path.setAttribute('pathLength', '1');
      path.style.strokeDasharray = '1';
      path.style.strokeDashoffset = '1';

      const delay = i * 20;
      const duration = 800;
      const start = performance.now() + delay;
      let rafId = 0;

      const step = (now: number) => {
        const elapsed = now - start;
        if (elapsed < 0) {
          rafId = requestAnimationFrame(step);
          return;
        }
        const t = Math.min(1, elapsed / duration);
        path.style.strokeDashoffset = String(1 - easeOutExpo(t));
        if (t < 1) {
          rafId = requestAnimationFrame(step);
        }
      };

      rafId = requestAnimationFrame(step);
      controllers.push(() => cancelAnimationFrame(rafId));
    });

    return () => {
      for (const cancel of controllers) cancel();
    };
  }, [reduced, data]);

  return (
    <div ref={wrapperRef} className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
              <stop offset="50%" stopColor="#7C3AED" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#6366F1" stopOpacity={0.7} />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="4"
                floodColor="#8B5CF6"
                floodOpacity="0.3"
              />
            </filter>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-700/50"
          />
          <XAxis
            dataKey="name"
            stroke="currentColor"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={10}
            className="text-slate-500 dark:text-slate-400"
          />
          <YAxis
            stroke="currentColor"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => value.toLocaleString('fa-IR')}
            className="text-slate-500 dark:text-slate-400"
            dx={-5}
          />
          <Tooltip
            content={tooltip}
            cursor={{
              fill: 'color-mix(in oklch, var(--at-accent, oklch(58% 0.2 265)) 10%, transparent)',
              radius: 8,
            }}
          />
          <Bar
            dataKey="بازدید"
            fill="url(#barGradient)"
            radius={[8, 8, 0, 0]}
            filter="url(#shadow)"
            role="img"
            aria-label="نمودار ستونی بازدید"
            maxBarSize={50}
            isAnimationActive={false}
            shape={<AnimatedRect />}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrafficChartInner;
