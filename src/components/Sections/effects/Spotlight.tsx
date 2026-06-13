'use client';

/**
 * Spotlight — نور متحرک که cursor رو دنبال می‌کنه
 *
 * تکنیک:
 *  - radial-gradient که با mousemove حرکت می‌کنه
 *  - GPU-only (transform)
 *  - فقط روی دسکتاپ (pointer: fine)
 *  - respect prefers-reduced-motion
 *  - می‌تونه به‌صورت prop intensity و color بگیره
 */

import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SpotlightProps {
  className?: string;
  /** شدت نور (0-1) */
  intensity?: number;
  /** رنگ نور */
  color?: string;
  /** اندازه‌ی شعاع نور */
  size?: number;
  children?: React.ReactNode;
}

export default function Spotlight({
  className,
  intensity = 0.4,
  color = '94, 106, 230', // primary-500 RGB
  size = 400,
  children,
}: SpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -9999, y: -9999 });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setEnabled(fine && !reduce);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setPos({ x: -9999, y: -9999 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn('relative overflow-hidden', className)}
    >
      {children}
      {enabled && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
          style={{
            background: `radial-gradient(${size}px circle at ${pos.x}px ${pos.y}px, rgba(${color}, ${intensity}), transparent 60%)`,
            opacity: pos.x === -9999 ? 0 : 1,
            transition: 'opacity 400ms ease-out',
          }}
          aria-hidden
        />
      )}
    </div>
  );
}
