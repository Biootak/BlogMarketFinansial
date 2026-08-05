'use client';

/**
 * TiltCard — کارت سه‌بعدی با tilt (CSS-driven, no framer-motion)
 *
 * رفتار قبلی: spring + MotionValue از framer-motion.
 * رفتار جدید: rAF-based smoothing روی rotateX/rotateY با همان spring-like feel.
 * Pointer: coarse (touch devices) → tilt غیرفعال.
 *
 * Performance: استفاده از ref و state برای چرخش به جای re-render هر frame
 * → main thread فقط CSS transform را update می‌کند.
 */

import { cn } from '@/lib/utils';
import { type ReactNode, useEffect, useRef, useState } from 'react';

export interface TiltCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  perspective?: number;
}

const SPRING_STIFFNESS = 280;
const SPRING_DAMPING = 24;
const _SPRING_CRITICAL = 2 * Math.sqrt(SPRING_STIFFNESS * 1); // mass = 1
// یه ضریب damping-ratio: damping/critical = 24 / (2*sqrt(280)) ≈ 0.72
// rAF interpolation: factor = 1 - exp(-rate * dt)
const _SPRING_RATE = 14; // tune شده برای حس مشابه framer-motion

// وقتی همه مقادیر spring به این نزدیکیِ صفر برسند، حلقه rAF می‌ایستد.
// قبل از این، حلقه forever روی 60fps می‌چرخید حتی وقتی کارت idle بود.
const SETTLE_EPSILON = 0.03;

export function TiltCard({
  children,
  className,
  intensity = 6,
  perspective = 1200,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ rx: 0, ry: 0, vx: 0, vy: 0 });
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setEnabled(!isCoarse && !reduce);
  }, []);

  // حلقه rAF فقط وقتی اجرا می‌شود که حرکت واقعی وجود داشته باشد:
  // ورود/خروج/حرکت پوینتر حلقه را start می‌کند؛ وقتی spring به حالت
  // settle رسید (≈صفر) حلقه متوقف می‌شود. تب مخفی هم pause می‌کند.
  useEffect(() => {
    if (!enabled) return;
    let rafId = 0;
    const tick = () => {
      const s = stateRef.current;
      const ax = -SPRING_STIFFNESS * s.rx - SPRING_DAMPING * s.vx;
      const ay = -SPRING_STIFFNESS * s.ry - SPRING_DAMPING * s.vy;
      const dt = 1 / 60;
      s.vx += ax * dt;
      s.vy += ay * dt;
      s.rx += s.vx * dt;
      s.ry += s.vy * dt;
      if (ref.current) {
        ref.current.style.transform = `perspective(${perspective}px) rotateX(${s.rx.toFixed(3)}deg) rotateY(${s.ry.toFixed(3)}deg)`;
      }
      const settled =
        Math.abs(s.rx) < SETTLE_EPSILON &&
        Math.abs(s.ry) < SETTLE_EPSILON &&
        Math.abs(s.vx) < SETTLE_EPSILON &&
        Math.abs(s.vy) < SETTLE_EPSILON;
      if (settled) {
        s.rx = 0;
        s.ry = 0;
        s.vx = 0;
        s.vy = 0;
        if (ref.current) ref.current.style.transform = '';
        rafId = 0;
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    const start = () => {
      if (rafId === 0) rafId = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    const el = ref.current;
    if (el) {
      el.addEventListener('pointerenter', start);
      el.addEventListener('pointerleave', start);
      el.addEventListener('pointermove', start);
    }
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (el) {
        el.removeEventListener('pointerenter', start);
        el.removeEventListener('pointerleave', start);
        el.removeEventListener('pointermove', start);
      }
      stop();
    };
  }, [enabled, perspective]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    // set target — spring physics در tick حلقه به این سمت میره
    // با replace کردن velocity، پرش نمیکنه
    stateRef.current.vx = -yPct * intensity * 8;
    stateRef.current.vy = xPct * intensity * 8;
  };

  const handleMouseLeave = () => {
    stateRef.current.vx = -stateRef.current.rx * 4;
    stateRef.current.vy = -stateRef.current.ry * 4;
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transformStyle: 'preserve-3d' }}
      className={cn('relative', className)}
    >
      {children}
    </div>
  );
}
