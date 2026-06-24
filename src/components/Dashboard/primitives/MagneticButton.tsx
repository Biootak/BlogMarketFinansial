'use client';

import { Button } from '@/components/ui/button';
import { type ComponentProps, useEffect, useRef } from 'react';

export interface MagneticButtonProps extends ComponentProps<typeof Button> {
  /** Maximum px offset in each axis. Default 6. */
  magnetRange?: number;
}

/**
 * MagneticButton — a shadcn Button that subtly translates toward the
 * cursor on hover. Honors prefers-reduced-motion (no listener attached).
 * Pass-through className so consumers can override shape (default Button
 * is rounded-md; consumers may opt into rounded-full via className).
 */
export function MagneticButton({
  magnetRange = 6,
  children,
  onMouseMove,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === 'undefined') return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    let frame: number | null = null;
    const handleMove = (e: MouseEvent) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left - rect.width / 2) / rect.width) * magnetRange;
        const y = ((e.clientY - rect.top - rect.height / 2) / rect.height) * magnetRange;
        el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
      });
    };
    const handleLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = null;
      el.style.transform = '';
    };
    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    };
  }, [magnetRange]);

  return (
    <Button ref={ref} {...props} onMouseMove={onMouseMove}>
      {children}
    </Button>
  );
}
