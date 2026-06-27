'use client';

/**
 * Category Accent — رنگ اختصاصی هر دسته
 *
 * رنگ‌ها low-saturation (slate / amber / cyan / emerald) — هیچ‌کدوم جیغ نیست.
 * از همون پالت ModernTrending استفاده می‌کنه.
 */

export type CategoryKey = 'همه' | 'طلا' | 'ارز دیجیتال' | 'بازار جهانی' | string;

export interface CategoryAccent {
  /** رنگ اصلی (HSL/HEX) */
  color: string;
  /** Tailwind classes برای bg subtle */
  bgClass: string;
  /** Tailwind classes برای text */
  textClass: string;
  /** Tailwind classes برای ring/border */
  ringClass: string;
  /** Shadow glow */
  glowClass: string;
  /** Dot color (برای live indicator) */
  dotClass: string;
}

export const CATEGORY_ACCENTS: Record<string, CategoryAccent> = {
  همه: {
    color: '#94a3b8', // slate
    bgClass: 'bg-slate-500/10',
    textClass: 'text-slate-700 dark:text-slate-300',
    ringClass: 'ring-slate-500/30',
    glowClass: 'shadow-[0_0_20px_-4px_rgba(148,163,184,0.4)]',
    dotClass: 'bg-slate-500',
  },
  طلا: {
    color: '#f59e0b', // amber (low-sat)
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-700 dark:text-amber-300',
    ringClass: 'ring-amber-500/30',
    glowClass: 'shadow-[0_0_20px_-4px_rgba(245,158,11,0.4)]',
    dotClass: 'bg-amber-500',
  },
  'ارز دیجیتال': {
    color: '#22d3ee', // cyan
    bgClass: 'bg-cyan-500/10',
    textClass: 'text-cyan-700 dark:text-cyan-300',
    ringClass: 'ring-cyan-500/30',
    glowClass: 'shadow-[0_0_20px_-4px_rgba(34,211,238,0.4)]',
    dotClass: 'bg-cyan-500',
  },
  'بازار جهانی': {
    color: '#10b981', // emerald
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    ringClass: 'ring-emerald-500/30',
    glowClass: 'shadow-[0_0_20px_-4px_rgba(16,185,129,0.4)]',
    dotClass: 'bg-emerald-500',
  },
};

export function getCategoryAccent(category: string): CategoryAccent {
  return (
    CATEGORY_ACCENTS[category] ?? {
      color: '#5b6cff', // primary
      bgClass: 'bg-primary-500/10',
      textClass: 'text-primary-700 dark:text-primary-300',
      ringClass: 'ring-primary-500/30',
      glowClass: 'shadow-[0_0_20px_-4px_rgba(94,106,230,0.4)]',
      dotClass: 'bg-primary-500',
    }
  );
}
