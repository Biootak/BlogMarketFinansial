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
    // color-contrast fix: slate-400 (#94a3b8) روی سفید کنتراست ۲.۵۶:۱ داشت.
    // slate-500 (#64748b) روی سفید = ۵.۷۵:۱ ✓ (WCAG AA)
    color: '#64748b', // slate-500 — accessible on white
    bgClass: 'bg-slate-500/10',
    textClass: 'text-slate-700 dark:text-slate-300',
    ringClass: 'ring-slate-500/30',
    glowClass: 'shadow-[0_0_20px_-4px_rgba(100,116,139,0.4)]',
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
      // color-contrast fix: #5b6cff روی سفید = 4.17:1 (زیر WCAG AA 4.5:1).
      // #4f5edb تیره‌تر است و کنتراست ≥ 4.5:1 دارد.
      color: '#4f5edb', // primary — accessible on white (≥ 4.5:1)
      bgClass: 'bg-primary-500/10',
      textClass: 'text-primary-700 dark:text-primary-300',
      ringClass: 'ring-primary-500/30',
      glowClass: 'shadow-[0_0_20px_-4px_rgba(79,94,219,0.4)]',
      dotClass: 'bg-primary-500',
    }
  );
}
