'use client';

/**
 * Magnetic — جذب ماوس (rAF-driven, no framer-motion)
 *
 * - spring-like smoothing روی x/y با همون ضرایب قبلی (stiffness 220, damping 18)
 * - pointer:coarse / prefers-reduced-motion → غیرفعال
 * - تنها direct style transform update → main thread safe
 */

import { cn } from '@/lib/utils';
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';

export interface MagneticProps {
  children: ReactNode;
  strength?: number;
  className?: string;
  style?: CSSProperties;
}

const STIFFNESS = 220;
const DAMPING = 18;
const MASS = 0.6;
const _CRITICAL = 2 * Math.sqrt(STIFFNESS * MASS);

// وقتی offset و سرعت به این نزدیکیِ صفر برسند، حلقه rAF می‌ایستد —
// قبل از این هر Magnetic روی هوم‌پیج forever با 60fps می‌سوخت.
const SETTLE_EPSILON = 0.05;

export function Magnetic({ children, strength = 0.2, className, style }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0 });
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setEnabled(!isCoarse && !reduce);
  }, []);

  // حلقه rAF فقط وقتی اجرا می‌شود که پوینتر روی المنت است یا spring در حال
  // بازگشت به مرکز (settle) است؛ به محض settle شدن، حلقه متوقف می‌شود.
  // تب مخفی هم pause می‌کند تا در background هیچ چرخه‌ای نسوزد.
  useEffect(() => {
    if (!enabled) return;
    let rafId = 0;
    const tick = () => {
      const s = stateRef.current;
      const ax = -STIFFNESS * (s.x - s.tx) - DAMPING * s.vx;
      const ay = -STIFFNESS * (s.y - s.ty) - DAMPING * s.vy;
      const dt = 1 / 60;
      s.vx += (ax / MASS) * dt;
      s.vy += (ay / MASS) * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (ref.current) {
        ref.current.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0)`;
      }
      const settled =
        Math.abs(s.x - s.tx) < SETTLE_EPSILON &&
        Math.abs(s.y - s.ty) < SETTLE_EPSILON &&
        Math.abs(s.vx) < SETTLE_EPSILON &&
        Math.abs(s.vy) < SETTLE_EPSILON;
      if (settled) {
        if (Math.abs(s.x) < SETTLE_EPSILON && Math.abs(s.y) < SETTLE_EPSILON && ref.current) {
          ref.current.style.transform = '';
          s.x = 0;
          s.y = 0;
        }
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
  }, [enabled]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - rect.left - rect.width / 2;
    const relY = e.clientY - rect.top - rect.height / 2;
    stateRef.current.tx = relX * strength;
    stateRef.current.ty = relY * strength;
  };

  const handleMouseLeave = () => {
    stateRef.current.tx = 0;
    stateRef.current.ty = 0;
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ willChange: 'transform', ...style }}
      className={cn(className)}
    >
      {children}
    </div>
  );
}
