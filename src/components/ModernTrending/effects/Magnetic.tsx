'use client';

/**
 * Magnetic — جذب ماوس (rAF-driven, no framer-motion)
 *
 * - spring-like smoothing روی x/y با همون ضرایب قبلی (stiffness 220, damping 18)
 * - pointer:coarse / prefers-reduced-motion → غیرفعال
 * - تنها direct style transform update → main thread safe
 */

import { type ReactNode, useRef, type CSSProperties, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface MagneticProps {
  children: ReactNode;
  strength?: number;
  className?: string;
  style?: CSSProperties;
}

const STIFFNESS = 220;
const DAMPING = 18;
const MASS = 0.6;
const CRITICAL = 2 * Math.sqrt(STIFFNESS * MASS);

export function Magnetic({
  children,
  strength = 0.2,
  className,
  style,
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0 });
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setEnabled(!isCoarse && !reduce);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let rafId = 0;
    const tick = () => {
      const s = stateRef.current;
      // semi-implicit Euler: spring + damping
      const ax = -STIFFNESS * (s.x - s.tx) - DAMPING * s.vx;
      const ay = -STIFFNESS * (s.y - s.ty) - DAMPING * s.vy;
      const dt = 1 / 60;
      s.vx += (ax / MASS) * dt;
      s.vy += (ay / MASS) * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (ref.current) {
        ref.current.style.transform =
          `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0)`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
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
