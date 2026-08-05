/**
 * Performance Utilities — 2026
 *
 * تعدادی ثابت و ابزار سبک برای تنظیمات تصویر و lazy-load.
 * هیچ کد مرده، TODO، یا console.log باقی نیست.
 */

/**
 * Image Optimization Configs
 */
export const IMAGE_CONFIGS = {
  quality: {
    hero: 90,
    card: 80,
    thumbnail: 75,
    avatar: 75,
  },

  sizes: {
    hero: '100vw',
    card: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    thumbnail: '(max-width: 640px) 25vw, 150px',
    avatar: '(max-width: 640px) 48px, 64px',
    full: '100vw',
  },

  aspectRatio: {
    hero: 16 / 9,
    card: 4 / 3,
    square: 1,
    wide: 21 / 9,
    portrait: 3 / 4,
  },

  // Blur placeholder (lightweight SVG)
  blurDataURL:
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg==',
} as const;

/**
 * Lazy Loading Thresholds
 */
export const LAZY_LOAD_CONFIG = {
  rootMargin: '50px',
  threshold: 0.01,
} as const;

/**
 * Web Vitals Thresholds (Google 2026)
 */
export const WEB_VITALS_THRESHOLDS = {
  fcp: { good: 1800, needsImprovement: 3000 },
  lcp: { good: 2500, needsImprovement: 4000 },
  fid: { good: 100, needsImprovement: 300 },
  cls: { good: 0.1, needsImprovement: 0.25 },
  ttfb: { good: 800, needsImprovement: 1800 },
} as const;

/**
 * Preload an image link into <head> (client-side only).
 */
export function preloadImage(src: string, priority: 'high' | 'low' = 'low') {
  if (typeof window === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  link.fetchPriority = priority;
  document.head.appendChild(link);
}

/**
 * requestIdleCallback polyfill (falls back to setTimeout(cb, 1)).
 */
export const requestIdleCallback: (cb: IdleRequestCallback) => number =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (window as Window & { requestIdleCallback: (cb: IdleRequestCallback) => number })
        .requestIdleCallback
    : (cb) => setTimeout(cb, 1) as unknown as number;

/**
 * cancelIdleCallback polyfill.
 */
export const cancelIdleCallback: (id: number) => void =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback
    : (id) => clearTimeout(id);
