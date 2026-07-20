'use client';

/**
 * EditorialHero — single focal anchor for the dashboard home.
 *
 * Typography-driven hierarchy: greeting, one big anchor number, a calm
 * sparkline, and a primary CTA. The gradient is a single emerald accent
 * wash — no glass, no aurora, no conic-glow.
 */

import CountUp from '@/components/Dashboard/DashboardPage/CountUp';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import {
  HiOutlineArrowDownRight,
  HiOutlineArrowUpRight,
  HiOutlineBolt,
  HiOutlineMinus,
  HiOutlinePencilSquare,
} from 'react-icons/hi2';
import { fmt, pickTrend, timeOfDay } from '../utils';

interface EditorialHeroProps {
  todayViews: number;
  totalViews: number;
  spark: number[];
}

function HeroSpark({ data, gradId }: { data: number[]; gradId: string }) {
  const pathRef = useRef<SVGPathElement>(null);
  const width = 600;
  const height = 76;

  useEffect(() => {
    if (!data.length || typeof window === 'undefined') return;
    const el = pathRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.strokeDashoffset = '0';
      return;
    }
    el.style.strokeDashoffset = '1';
    const duration = 1200;
    let raf = 0;
    let start: number | null = null;
    const ease = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
    const step = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      el.style.strokeDashoffset = String(1 - ease(t));
      if (t < 1) raf = window.requestAnimationFrame(step);
    };
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [data]);

  if (!data.length) return null;
  const allZero = data.every((v) => v === 0);
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const span = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = allZero ? height - 4 : height - 6 - ((v - min) / span) * (height - 12);
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const area = allZero ? '' : `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="ec-hero__spark"
      role="img"
      aria-label="روند بازدید"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ec-accent)" stopOpacity={0.18} />
          <stop offset="100%" stopColor="var(--ec-accent)" stopOpacity={0} />
        </linearGradient>
      </defs>
      {area && <path d={area} fill={`url(#${gradId})`} />}
      {allZero && (
        <line
          x1="0"
          y1={height - 4}
          x2={width}
          y2={height - 4}
          stroke="var(--ec-line-strong)"
          strokeWidth={1}
          strokeDasharray="6 4"
          opacity={0.6}
        />
      )}
      <path
        ref={pathRef}
        d={line}
        fill="none"
        stroke="var(--ec-fg)"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        style={{ strokeDasharray: 1, strokeDashoffset: 1, opacity: allZero ? 0.4 : 1 }}
      />
    </svg>
  );
}

export default function EditorialHero({ todayViews, totalViews, spark }: EditorialHeroProps) {
  const user = useCurrentUser();
  const gradId = useId();
  const [hour, setHour] = useState(12);

  useEffect(() => {
    const update = () => setHour(new Date().getHours());
    update();
    const t = window.setInterval(update, 5 * 60_000);
    return () => window.clearInterval(t);
  }, []);

  const greeting = timeOfDay(hour);
  const { trend, delta } = pickTrend(spark);
  const TrendIcon =
    trend === 'up'
      ? HiOutlineArrowUpRight
      : trend === 'down'
        ? HiOutlineArrowDownRight
        : HiOutlineMinus;

  const jalaliYear = new Intl.DateTimeFormat('fa-IR', { year: 'numeric' }).format(new Date());

  return (
    <section className="ec-tile ec-hero" aria-label="خلاصهٔ امروز">
      <span className="ec-hero__eyebrow">
        <span className="ec-hero__dot" aria-hidden />
        <HiOutlineBolt className="w-3 h-3" aria-hidden />
        <span>پیشخوان زنده · {jalaliYear}</span>
      </span>

      <h1 className="ec-hero__greeting">
        {greeting}، <em className="ec-hero__name">{user?.name ?? 'کاربر'}</em>
      </h1>

      <div className="ec-hero__number">
        <span className="ec-hero__value" aria-label={`${fmt(todayViews)} بازدید امروز`}>
          <CountUp value={todayViews} duration={1200} />
        </span>
        <span className="ec-hero__unit">بازدید امروز</span>
      </div>

      <div className="ec-hero__meta">
        <span className={cn('ec-hero__delta', `ec-hero__delta--${trend}`)}>
          <TrendIcon className="w-3 h-3" aria-hidden />
          <span className="tabular-nums">{`${delta > 0 ? '+' : ''}${delta.toFixed(1)}٪`}</span>
        </span>
        <span>نسبت به نیمهٔ قبلی</span>
        <span aria-hidden>·</span>
        <span>از {fmt(totalViews)} بازدید کل</span>
      </div>

      <HeroSpark data={spark} gradId={`ec-hero-${gradId}`} />

      <div className="ec-hero__actions">
        <Link href="/dashboard/posts/create" className="ec-hero__cta" aria-label="نوشتن پست جدید">
          <HiOutlinePencilSquare className="w-3.5 h-3.5" aria-hidden />
          <span>نوشتن پست جدید</span>
        </Link>
        <Link href="/dashboard/posts" className="ec-hero__ghost">
          <span>همهٔ پست‌ها</span>
        </Link>
      </div>
    </section>
  );
}
