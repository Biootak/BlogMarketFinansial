'use client';

/**
 * TextGradient — متن با گرادینت ملایم
 *
 * Linear.app / Vercel style:
 * - رنگ‌های low-saturation (نه جیغ)
 * - animation فقط در hover یا وقتی data-animate باشه
 * - text-shadow ضد pixelation
 */

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface TextGradientProps {
  children: ReactNode;
  className?: string;
  /** variant: refined palettes */
  variant?: 'default' | 'mono' | 'cool' | 'warm';
  /** کلاس‌های اضافی */
}

const VARIANTS = {
  default:
    'from-[rgb(var(--c-foreground))] via-[rgb(var(--c-primary-400))] to-[rgb(var(--c-foreground))]',
  mono: 'from-[rgb(var(--c-foreground))] via-[rgb(var(--c-neutral-500))] to-[rgb(var(--c-foreground))]',
  cool: 'from-[rgb(var(--c-primary-500))] via-[rgb(var(--c-primary-300))] to-[rgb(var(--c-primary-500))]',
  warm: 'from-[rgb(var(--c-foreground))] via-[rgb(var(--c-accent))] to-[rgb(var(--c-foreground))]',
} as const;

export function TextGradient({ children, className, variant = 'default' }: TextGradientProps) {
  return (
    <span
      className={cn(
        'inline-block bg-gradient-to-r bg-clip-text text-transparent',
        'bg-[length:200%_auto]',
        'animate-gradient',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
