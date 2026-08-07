/**
 * Font Optimization Strategy - 2026 Best Practices
 *
 * استراتژی بهینه‌سازی فونت‌ها برای بهترین performance
 * - Preload critical fonts
 * - Font display swap
 * - Subset optimization
 * - Variable font usage
 */

import localFont from 'next/font/local';

/**
 * Estedad - فونت فارسی/عربی اصلی
 *
 * Optimization:
 * - Variable font (100-900) - یک فایل برای همه وزن‌ها
 * - دو subset جداگانه (arabic + latin)
 * - Preload فقط arabic subset (critical)
 * - Latin on-demand (non-critical)
 * - Font display: swap (FOUT بهتر از FOIT)
 */
export const estedad = localFont({
  src: [
    {
      path: './estedad/estedad-arabic-wght-normal.woff2',
      weight: '100 900',
      style: 'normal',
    },
    {
      path: './estedad/estedad-latin-wght-normal.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-estedad',
  preload: true,
  adjustFontFallback: 'Arial',
  fallback: ['Arial', 'sans-serif'],
});

/**
 * Geist - فونت انگلیسی
 *
 * Optimization:
 * - Variable font
 * - Preload: false (non-critical)
 * - Display: swap
 */
export const geist = localFont({
  src: './geist/Geist-Variable.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-geist',
  preload: false,
  adjustFontFallback: 'Arial',
  fallback: ['Arial', 'sans-serif'],
});

/**
 * Font Loading Strategy
 */
export const FONT_STRATEGY = {
  // Critical fonts - preload
  critical: ['estedad-arabic'],

  // Non-critical fonts - load on demand
  nonCritical: ['estedad-latin', 'geist'],

  // Font display strategy
  display: 'swap' as const,

  // Fallback fonts
  fallback: {
    persian: ['Arial', 'Tahoma', 'sans-serif'],
    english: ['Arial', 'Helvetica', 'sans-serif'],
  },
} as const;

/**
 * Font Preload Links - برای استفاده در head
 */
export function getFontPreloadLinks() {
  return [
    {
      rel: 'preload',
      href: '/fonts/estedad/estedad-arabic-wght-normal.woff2',
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    },
  ];
}

/**
 * Font Face CSS - برای manual optimization
 */
export const FONT_FACE_CSS = `
@font-face {
  font-family: 'Estedad';
  src: url('/fonts/estedad/estedad-arabic-wght-normal.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0600-06FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE80-FEFC;
}

@font-face {
  font-family: 'Estedad';
  src: url('/fonts/estedad/estedad-latin-wght-normal.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Geist';
  src: url('/fonts/geist/Geist-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
`;

/**
 * Font Loading Performance Tips
 */
export const FONT_PERFORMANCE_TIPS = {
  // 1. Use variable fonts (single file for all weights)
  variableFonts: true,

  // 2. Subset fonts (separate files for different scripts)
  subsetting: true,

  // 3. Preload only critical fonts
  preloadCritical: true,

  // 4. Use font-display: swap
  fontDisplay: 'swap',

  // 5. Self-host fonts (no external requests)
  selfHost: true,

  // 6. Use woff2 format (best compression)
  format: 'woff2',

  // 7. Adjust font fallback (reduce CLS)
  adjustFallback: true,
} as const;

/**
 * Calculate Font Metrics for Fallback
 */
export function calculateFontMetrics(fontFamily: string) {
  // این متریک‌ها برای کاهش CLS استفاده می‌شوند
  const metrics = {
    estedad: {
      ascent: 0.9,
      descent: 0.2,
      lineGap: 0,
      sizeAdjust: '100%',
    },
    geist: {
      ascent: 0.9,
      descent: 0.2,
      lineGap: 0,
      sizeAdjust: '100%',
    },
  };

  return metrics[fontFamily as keyof typeof metrics] || metrics.estedad;
}
