'use client';

/**
 * Spotlight — نور متحرک که cursor رو دنبال می‌کنه
 *
 * تکنیک:
 *  - radial-gradient که با mousemove حرکت می‌کنه
 *  - GPU-only: pos با useRef + مستقیم DOM style (بدون React re-render)
 *  - فقط روی دسکتاپ (pointer: fine)
 *  - respect prefers-reduced-motion
 *  - می‌تونه به‌صورت prop intensity و color بگیره
 */

import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const enabledRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    enabledRef.current = fine && !reduce;

    const layer = layerRef.current;
    if (!layer) return;
    // نمایش یا پنهان‌کردن layer بر اساس قابلیت
    layer.style.display = enabledRef.current ? 'block' : 'none';
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabledRef.current || !containerRef.current || !layerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // مستقیم DOM style — بدون setState = بدون React re-render
    layerRef.current.style.background = `radial-gradient(${size}px circle at ${x}px ${y}px, rgba(${color}, ${intensity}), transparent 60%)`;
    layerRef.current.style.opacity = '1';
  };

  const handleMouseLeave = () => {
    if (!layerRef.current) return;
    layerRef.current.style.opacity = '0';
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn('relative overflow-hidden', className)}
    >
      {children}
      <div
        ref={layerRef}
        className="pointer-events-none absolute inset-0"
        style={{
          display: 'none',
          opacity: 0,
          transition: 'opacity 400ms ease-out',
        }}
        aria-hidden
      />
    </div>
  );
}
