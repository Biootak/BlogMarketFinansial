/**
 * Category Themes — Editorial Spotlight
 * ----------------------------------------------------------------------------
 * هر دسته‌بندی پالت رنگی اختصاصی خودش رو داره تا اسلایدر هوم
 * با تغییر پست، حال‌وهوای بصری متناسب با موضوع داشته باشه.
 *
 * هر تم شامل:
 *  - gradient: کلاس‌های Tailwind برای پس‌زمینه گرادینت
 *  - accent: رنگ اصلی شاخص (badge, progress, dot)
 *  - accentSoft: نسخه ملایم‌تر برای overlay
 *  - text: رنگ متن روی گرادینت
 *  - border: رنگ کادر
 *  - glow: رنگ سایه/درخشش
 *  - label: برچسب فارسی برای badge بالای اسلاید
 * ----------------------------------------------------------------------------
 */

export type CategoryTheme = {
  gradient: string;
  accent: string;
  accentSoft: string;
  text: string;
  border: string;
  glow: string;
  badge: string;
  ring: string;
  /** رنگ‌های واقعی CSS برای conic-gradient border animation */
  glowA: string;
  glowB: string;
};

export type SentimentType = 'bullish' | 'bearish' | 'neutral';

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  // ارز دیجیتال — بنفش تکنولوژیک
  crypto: {
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    accent: 'bg-violet-500',
    accentSoft: 'bg-violet-500/20',
    text: 'text-violet-100',
    border: 'border-violet-400/30',
    glow: 'shadow-violet-500/40',
    badge: 'bg-gradient-to-r from-violet-500 to-indigo-500',
    ring: 'ring-violet-400/40',
    glowA: '#7c3aed',
    glowB: '#4338ca',
  },
  bitcoin: {
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    accent: 'bg-amber-500',
    accentSoft: 'bg-amber-500/20',
    text: 'text-amber-100',
    border: 'border-amber-400/30',
    glow: 'shadow-amber-500/40',
    badge: 'bg-gradient-to-r from-amber-500 to-orange-500',
    ring: 'ring-amber-400/40',
    glowA: '#f59e0b',
    glowB: '#ea580c',
  },
  // بورس و بازار سرمایه — سبز کلاسیک
  bourse: {
    gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    accent: 'bg-emerald-500',
    accentSoft: 'bg-emerald-500/20',
    text: 'text-emerald-100',
    border: 'border-emerald-400/30',
    glow: 'shadow-emerald-500/40',
    badge: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    ring: 'ring-emerald-400/40',
    glowA: '#059669',
    glowB: '#0891b2',
  },
  stock: {
    gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    accent: 'bg-emerald-500',
    accentSoft: 'bg-emerald-500/20',
    text: 'text-emerald-100',
    border: 'border-emerald-400/30',
    glow: 'shadow-emerald-500/40',
    badge: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    ring: 'ring-emerald-400/40',
    glowA: '#059669',
    glowB: '#0891b2',
  },
  // طلا و سکه — طلایی گرم
  gold: {
    gradient: 'from-yellow-500 via-amber-500 to-orange-600',
    accent: 'bg-amber-500',
    accentSoft: 'bg-amber-500/20',
    text: 'text-amber-100',
    border: 'border-amber-400/30',
    glow: 'shadow-amber-500/40',
    badge: 'bg-gradient-to-r from-yellow-500 to-amber-500',
    ring: 'ring-amber-400/40',
    glowA: '#eab308',
    glowB: '#f97316',
  },
  // مسکن — قهوه‌ای گرم
  realestate: {
    gradient: 'from-stone-600 via-stone-700 to-stone-800',
    accent: 'bg-stone-500',
    accentSoft: 'bg-stone-500/20',
    text: 'text-stone-100',
    border: 'border-stone-400/30',
    glow: 'shadow-stone-500/40',
    badge: 'bg-gradient-to-r from-stone-500 to-stone-700',
    ring: 'ring-stone-400/40',
    glowA: '#78716c',
    glowB: '#57534e',
  },
  // اقتصاد کلان — آبی حرفه‌ای
  economy: {
    gradient: 'from-sky-600 via-blue-600 to-indigo-700',
    accent: 'bg-blue-500',
    accentSoft: 'bg-blue-500/20',
    text: 'text-blue-100',
    border: 'border-blue-400/30',
    glow: 'shadow-blue-500/40',
    badge: 'bg-gradient-to-r from-sky-500 to-blue-500',
    ring: 'ring-blue-400/40',
    glowA: '#0284c7',
    glowB: '#4338ca',
  },
  forex: {
    gradient: 'from-sky-600 via-blue-600 to-indigo-700',
    accent: 'bg-blue-500',
    accentSoft: 'bg-blue-500/20',
    text: 'text-blue-100',
    border: 'border-blue-400/30',
    glow: 'shadow-blue-500/40',
    badge: 'bg-gradient-to-r from-sky-500 to-blue-500',
    ring: 'ring-blue-400/40',
    glowA: '#0284c7',
    glowB: '#4338ca',
  },
  // خودرو — قرمز پویا
  car: {
    gradient: 'from-rose-600 via-red-600 to-pink-700',
    accent: 'bg-rose-500',
    accentSoft: 'bg-rose-500/20',
    text: 'text-rose-100',
    border: 'border-rose-400/30',
    glow: 'shadow-rose-500/40',
    badge: 'bg-gradient-to-r from-rose-500 to-pink-500',
    ring: 'ring-rose-400/40',
    glowA: '#e11d48',
    glowB: '#db2777',
  },
  // فناوری — فیروزه‌ای مدرن
  tech: {
    gradient: 'from-cyan-600 via-teal-600 to-emerald-700',
    accent: 'bg-cyan-500',
    accentSoft: 'bg-cyan-500/20',
    text: 'text-cyan-100',
    border: 'border-cyan-400/30',
    glow: 'shadow-cyan-500/40',
    badge: 'bg-gradient-to-r from-cyan-500 to-teal-500',
    ring: 'ring-cyan-400/40',
    glowA: '#0891b2',
    glowB: '#059669',
  },
  // پیش‌فرض — نوترال
  default: {
    gradient: 'from-slate-700 via-slate-800 to-neutral-900',
    accent: 'bg-slate-500',
    accentSoft: 'bg-slate-500/20',
    text: 'text-slate-100',
    border: 'border-slate-400/30',
    glow: 'shadow-slate-500/40',
    badge: 'bg-gradient-to-r from-slate-500 to-neutral-700',
    ring: 'ring-slate-400/40',
    glowA: '#64748b',
    glowB: '#334155',
  },
};

/**
 * تشخیص تم بر اساس slug دسته‌بندی
 * کلیدواژه‌های متعدد برای تطابق با slugs مختلف
 */
export function getCategoryTheme(
  categorySlug?: string | null,
  categoryName?: string | null,
): CategoryTheme {
  const haystack = `${categorySlug ?? ''} ${categoryName ?? ''}`.toLowerCase().trim();

  if (!haystack) return CATEGORY_THEMES.default;

  // ترتیب بررسی مهمه: کلیدواژه‌های خاص‌تر اول
  if (/bitcoin|بیت.?کوین|btc/.test(haystack)) return CATEGORY_THEMES.bitcoin;
  if (/crypto|ارز.*دیجیتال|کریپتو|رمز.*ارز/.test(haystack)) return CATEGORY_THEMES.crypto;
  if (/gold|طلا|سکه/.test(haystack)) return CATEGORY_THEMES.gold;
  if (/بورس|بازار.*سرمایه|سهام|شاخص/.test(haystack)) return CATEGORY_THEMES.bourse;
  if (/stock|سهام/.test(haystack)) return CATEGORY_THEMES.stock;
  if (/real.?estate|مسکن|مِلک|املاک/.test(haystack)) return CATEGORY_THEMES.realestate;
  if (/forex|ارز|دلار|یورو/.test(haystack)) return CATEGORY_THEMES.forex;
  if (/economy|اقتصاد|تورم/.test(haystack)) return CATEGORY_THEMES.economy;
  if (/خودرو|ماشین|اتومبیل/.test(haystack)) return CATEGORY_THEMES.car;
  if (/tech|فناوری|تکنولوژی/.test(haystack)) return CATEGORY_THEMES.tech;

  return CATEGORY_THEMES.default;
}

/**
 * تشخیص sentiment پست از عنوان و excerpt
 * برای badge صعودی/نزولی/خنثی
 */
export function detectSentiment(title: string, excerpt?: string | null): SentimentType {
  const text = `${title} ${excerpt ?? ''}`.toLowerCase();

  // کلیدواژه‌های صعودی
  const bullishKeywords = [
    'افزایش',
    'صعود',
    'رشد',
    'سود',
    'سودآوری',
    'پیروزی',
    'موفقیت',
    'بهبود',
    'بالاترین',
    'رکورد',
    'صعودی',
    'گران',
    'گرانی',
    'افزایشی',
    'تقویت',
    'احیا',
    'رونق',
    'شکوفایی',
    'پرش',
    'جهش',
    'برتری',
    'increase',
    'rise',
    'growth',
    'profit',
    'gain',
    'surge',
    'rally',
    'bull',
    'bullish',
    'up',
    'higher',
    'boost',
  ];

  // کلیدواژه‌های نزولی
  const bearishKeywords = [
    'کاهش',
    'سقوط',
    'زیان',
    'ضرر',
    'افت',
    'نزول',
    'بحران',
    'رکود',
    'پایین‌ترین',
    'بدترین',
    'خسارت',
    'نگرانی',
    'هشدار',
    'خطر',
    'تنش',
    'تحریم',
    'فشار',
    'کسری',
    'بحران',
    'ریزش',
    'ریزشی',
    'decrease',
    'fall',
    'drop',
    'loss',
    'decline',
    'crash',
    'recession',
    'bear',
    'bearish',
    'down',
    'lower',
    'concern',
    'risk',
    'warning',
  ];

  const bullishScore = bullishKeywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
  const bearishScore = bearishKeywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);

  if (bullishScore > bearishScore) return 'bullish';
  if (bearishScore > bullishScore) return 'bearish';
  return 'neutral';
}

export const SENTIMENT_CONFIG: Record<
  SentimentType,
  {
    label: string;
    shortLabel: string;
    gradient: string;
    icon: 'up' | 'down' | 'flat';
    ring: string;
    text: string;
  }
> = {
  bullish: {
    label: 'صعودی',
    shortLabel: '↑',
    gradient: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    icon: 'up',
    ring: 'ring-emerald-400/40',
    text: 'text-emerald-50',
  },
  bearish: {
    label: 'نزولی',
    shortLabel: '↓',
    gradient: 'bg-gradient-to-r from-rose-500 to-pink-600',
    icon: 'down',
    ring: 'ring-rose-400/40',
    text: 'text-rose-50',
  },
  neutral: {
    label: 'خنثی',
    shortLabel: '–',
    gradient: 'bg-gradient-to-r from-amber-500 to-orange-500',
    icon: 'flat',
    ring: 'ring-amber-400/40',
    text: 'text-amber-50',
  },
};
