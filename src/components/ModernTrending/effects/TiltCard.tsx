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

import { type ReactNode, useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface TiltCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  perspective?: number;
}

const SPRING_STIFFNESS = 280;
const SPRING_DAMPING = 24;
const SPRING_CRITICAL = 2 * Math.sqrt(SPRING_STIFFNESS * 1); // mass = 1
// یه ضریب damping-ratio: damping/critical = 24 / (2*sqrt(280)) ≈ 0.72
// rAF interpolation: factor = 1 - exp(-rate * dt)
const SPRING_RATE = 14; // tune شده برای حس مشابه framer-motion

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
    setEnabled(!isCoarse);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let rafId = 0;
    const tick = () => {
      const s = stateRef.current;
      // velocity Verlet integration برای spring
      const ax = -SPRING_STIFFNESS * (s.rx - 0) - SPRING_DAMPING * s.vx;
      const ay = -SPRING_STIFFNESS * (s.ry - 0) - SPRING_DAMPING * s.vy;
      const dt = 1 / 60;
      s.vx += ax * dt;
      s.vy += ay * dt;
      s.rx += s.vx * dt;
      s.ry += s.vy * dt;
      if (ref.current) {
        ref.current.style.transform =
          `perspective(${perspective}px) rotateX(${s.rx.toFixed(3)}deg) rotateY(${s.ry.toFixed(3)}deg)`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
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
