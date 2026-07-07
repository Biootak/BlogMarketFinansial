'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * TrustStrip — single horizontal row of numeric trust stats.
 *
 * Design intent:
 * - Tabular-nums, big numbers, small label below — Vercel-style metrics.
 * - 2-col on mobile, 4-col on desktop.
 * - Inline vertical separators between cells.
 *
 * 2026-07-05: built new. Replaces no prior equivalent.
 */

interface Props {
  /** Total transfer volume in USD (formatted in source). */
  totalVolume?: string;
  /** Number of supported currencies. */
  currencies?: number;
  /** Number of destination countries. */
  countries?: number;
  /** Years of operation. */
  yearsActive?: number;
  /** Average response time in minutes. */
  responseTimeMin?: number;
  /** Customer satisfaction percentage. */
  satisfactionPct?: number;
}

/** Count-up on scroll-into-view — respects prefers-reduced-motion */
function CountUpNumber({ target, duration = 1600 }: { target: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);

  // Check reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(target);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReducedMotion, target]);

  useEffect(() => {
    if (!started || prefersReducedMotion) return;
    const startTime = performance.now();
    let raf: number;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplay(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [started, target, duration, prefersReducedMotion]);

  const formatted = new Intl.NumberFormat('fa-IR').format(display);
  return <span ref={ref}>{formatted}</span>;
}

export default function TrustStrip(props: Props) {
  const {
    totalVolume = '۲۴۰M+',
    currencies = 35,
    countries = 50,
    yearsActive = 8,
    responseTimeMin = 15,
    satisfactionPct = 98,
  } = props;

  return (
    <div className="mt-trust" role="list">
      <div className="mt-trust__cell mt-fade-up mt-fade-up-d1" role="listitem">
        <span className="mt-trust__num">
          <span>{totalVolume}</span>
          <span className="mt-trust__num-suffix">$</span>
        </span>
        <span className="mt-trust__label">حجم تراکنش سالانه</span>
      </div>

      <div className="mt-trust__cell mt-fade-up mt-fade-up-d2" role="listitem">
        <span className="mt-trust__num">
          <CountUpNumber target={currencies} />
          <span className="mt-trust__num-suffix">+</span>
        </span>
        <span className="mt-trust__label">ارز قابل پشتیبانی</span>
      </div>

      <div className="mt-trust__cell mt-fade-up mt-fade-up-d3" role="listitem">
        <span className="mt-trust__num">
          <CountUpNumber target={countries} />
          <span className="mt-trust__num-suffix">+</span>
        </span>
        <span className="mt-trust__label">کشور مقصد</span>
      </div>

      <div className="mt-trust__cell mt-fade-up mt-fade-up-d4" role="listitem">
        <span className="mt-trust__num">
          <CountUpNumber target={yearsActive} />
          <span className="mt-trust__num-suffix">سال</span>
        </span>
        <span className="mt-trust__label">سابقه فعالیت مستمر</span>
      </div>
    </div>
  );
}