import type { TwMainColor } from '@/types/types';

/**
 * تنظیمات رنگی هر دسته‌بندی — شامل گرادینت، رنگ متن، glow و آیکون پیشنهادی
 * برای هماهنگی با تم روشن/تاریک
 */
export interface CategoryColorConfig {
  /** گرادینت پس‌زمینه (کلاس Tailwind) */
  gradient: string;
  /** گرادینت تیره برای dark mode */
  gradientDark: string;
  /** رنگ ring/glow */
  glow: string;
  /** رنگ متن اصلی */
  text: string;
  /** رنگ accent (برای badge) */
  accent: string;
  /** کلاس bg برای بخش کوچک */
  bgSoft: string;
  /** رنگ border */
  border: string;
  /** آیکون lucide پیشنهادی برای هر دسته */
  icon: string;
}

export const CATEGORY_COLOR_MAP: Record<TwMainColor | string, CategoryColorConfig> = {
  // صورتی
  pink: {
    gradient: 'from-pink-500/20 via-rose-400/10 to-orange-300/20',
    gradientDark: 'from-pink-500/30 via-rose-500/20 to-orange-400/10',
    glow: 'shadow-[0_0_60px_-15px_rgba(244,114,182,0.6)]',
    text: 'text-pink-600 dark:text-pink-400',
    accent: 'bg-pink-500',
    bgSoft: 'bg-pink-500/10',
    border: 'border-pink-500/30',
    icon: 'Heart',
  },
  // آبی
  blue: {
    gradient: 'from-blue-500/20 via-cyan-400/10 to-sky-300/20',
    gradientDark: 'from-blue-500/30 via-cyan-500/20 to-sky-400/10',
    glow: 'shadow-[0_0_60px_-15px_rgba(59,130,246,0.6)]',
    text: 'text-blue-600 dark:text-blue-400',
    accent: 'bg-blue-500',
    bgSoft: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'TrendingUp',
  },
  // سبز
  green: {
    gradient: 'from-emerald-500/20 via-green-400/10 to-lime-300/20',
    gradientDark: 'from-emerald-500/30 via-green-500/20 to-lime-400/10',
    glow: 'shadow-[0_0_60px_-15px_rgba(16,185,129,0.6)]',
    text: 'text-emerald-600 dark:text-emerald-400',
    accent: 'bg-emerald-500',
    bgSoft: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: 'BarChart',
  },
  // زرد
  yellow: {
    gradient: 'from-amber-500/20 via-yellow-300/10 to-orange-300/20',
    gradientDark: 'from-amber-500/30 via-yellow-400/20 to-orange-400/10',
    glow: 'shadow-[0_0_60px_-15px_rgba(245,158,11,0.6)]',
    text: 'text-amber-600 dark:text-amber-400',
    accent: 'bg-amber-500',
    bgSoft: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: 'Tag',
  },
  // قرمز
  red: {
    gradient: 'from-red-500/20 via-rose-400/10 to-pink-300/20',
    gradientDark: 'from-red-500/30 via-rose-500/20 to-pink-400/10',
    glow: 'shadow-[0_0_60px_-15px_rgba(239,68,68,0.6)]',
    text: 'text-red-600 dark:text-red-400',
    accent: 'bg-red-500',
    bgSoft: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'FileText',
  },
  // بنفش
  purple: {
    gradient: 'from-purple-500/20 via-violet-400/10 to-fuchsia-300/20',
    gradientDark: 'from-purple-500/30 via-violet-500/20 to-fuchsia-400/10',
    glow: 'shadow-[0_0_60px_-15px_rgba(168,85,247,0.6)]',
    text: 'text-purple-600 dark:text-purple-400',
    accent: 'bg-purple-500',
    bgSoft: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: 'Hash',
  },
  // نیلی
  indigo: {
    gradient: 'from-indigo-500/20 via-blue-400/10 to-violet-300/20',
    gradientDark: 'from-indigo-500/30 via-blue-500/20 to-violet-400/10',
    glow: 'shadow-[0_0_60px_-15px_rgba(99,102,241,0.6)]',
    text: 'text-indigo-600 dark:text-indigo-400',
    accent: 'bg-indigo-500',
    bgSoft: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    icon: 'MessageCircle',
  },
  // خاکستری
  gray: {
    gradient: 'from-slate-500/20 via-gray-400/10 to-zinc-300/20',
    gradientDark: 'from-slate-500/30 via-gray-500/20 to-zinc-400/10',
    glow: 'shadow-[0_0_60px_-15px_rgba(100,116,139,0.6)]',
    text: 'text-slate-600 dark:text-slate-400',
    accent: 'bg-slate-500',
    bgSoft: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    icon: 'Hash',
  },
};

/** رنگ پیش‌فرض وقتی color تعریف نشده */
export const DEFAULT_CATEGORY_COLOR: CategoryColorConfig = {
  gradient: 'from-violet-500/20 via-fuchsia-400/10 to-pink-300/20',
  gradientDark: 'from-violet-500/30 via-fuchsia-500/20 to-pink-400/10',
  glow: 'shadow-[0_0_60px_-15px_rgba(139,92,246,0.6)]',
  text: 'text-violet-600 dark:text-violet-400',
  accent: 'bg-violet-500',
  bgSoft: 'bg-violet-500/10',
  border: 'border-violet-500/30',
  icon: 'Hash',
};

/** لیست رنگ‌ها برای fallback چرخشی وقتی color نداریم */
export const ROTATING_COLORS: (TwMainColor | string)[] = [
  'blue',
  'purple',
  'pink',
  'green',
  'amber',
  'cyan',
  'rose',
  'indigo',
  'emerald',
  'orange',
];

/**
 * گرفتن تنظیمات رنگ برای یک دسته
 * - اگر color داشت → استفاده از اون
 * - در غیر این صورت → چرخشی بر اساس id
 */
export function getCategoryColor(
  color: string | undefined,
  index: number,
  id?: string,
): CategoryColorConfig {
  if (color && CATEGORY_COLOR_MAP[color]) {
    return CATEGORY_COLOR_MAP[color];
  }
  // fallback به چرخش امن — استفاده از پیش‌فرض اگه رنگ ناشناس بود
  const seedKey = (id ? hashString(id) : index) % ROTATING_COLORS.length;
  const safeColor = ROTATING_COLORS[seedKey];
  return CATEGORY_COLOR_MAP[safeColor] ?? DEFAULT_CATEGORY_COLOR;
}

/** hash ساده برای استفاده در seed رنگ */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
