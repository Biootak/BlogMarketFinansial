/**
 * Performance Optimization Utilities
 * 
 * مجموعه ابزارهای بهینه‌سازی performance برای کل سایت
 * Best practices 2026 برای Next.js 15+
 */

/**
 * Resource Hints - برای بهبود loading time
 */
export const RESOURCE_HINTS = {
  // DNS prefetch برای دامنه‌های خارجی
  dnsPrefetch: [
    'https://fonts.googleapis.com',
    'https://www.google-analytics.com',
  ],
  
  // Preconnect برای منابع critical
  preconnect: [
    'https://fonts.gstatic.com',
  ],
  
  // Preload برای منابع critical بالای fold
  preload: [
    { href: '/fonts/estedad/estedad-arabic-wght-normal.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
  ],
} as const;

/**
 * Image Optimization Configs
 */
export const IMAGE_CONFIGS = {
  // Quality presets
  quality: {
    hero: 90,
    card: 80,
    thumbnail: 75,
    avatar: 75,
  },
  
  // Sizes presets برای responsive images
  sizes: {
    hero: '100vw',
    card: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    thumbnail: '(max-width: 640px) 25vw, 150px',
    avatar: '(max-width: 640px) 48px, 64px',
    full: '100vw',
  },
  
  // Aspect ratios
  aspectRatio: {
    hero: 16 / 9,
    card: 4 / 3,
    square: 1,
    wide: 21 / 9,
    portrait: 3 / 4,
  },
  
  // Blur placeholder base64
  blurDataURL: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg==',
} as const;

/**
 * Lazy Loading Thresholds
 */
export const LAZY_LOAD_CONFIG = {
  // Intersection Observer options
  rootMargin: '50px', // شروع load قبل از رسیدن به viewport
  threshold: 0.01,
  
  // Component lazy loading
  componentDelay: 100, // ms delay برای dynamic imports
} as const;

/**
 * Bundle Optimization
 */
export const BUNDLE_CONFIG = {
  // Chunk size limits (KB)
  maxChunkSize: 244, // Next.js default
  
  // Code splitting strategy
  splitChunks: {
    // Vendor chunks
    vendors: ['react', 'react-dom', 'next'],
    
    // Shared chunks
    shared: ['@/components/ui', '@/lib'],
  },
} as const;

/**
 * Cache Strategy
 */
export const CACHE_CONFIG = {
  // Static assets
  static: {
    maxAge: 31536000, // 1 year
    immutable: true,
  },
  
  // Dynamic content
  dynamic: {
    maxAge: 3600, // 1 hour
    staleWhileRevalidate: 86400, // 1 day
  },
  
  // API responses
  api: {
    maxAge: 60, // 1 minute
    staleWhileRevalidate: 300, // 5 minutes
  },
} as const;

/**
 * Performance Monitoring
 */
export interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

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
 * Measure Web Vitals
 */
export function measureWebVitals(metric: PerformanceMetrics) {
  const { fcp, lcp, fid, cls, ttfb } = metric;
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vitals:', {
      FCP: `${fcp}ms`,
      LCP: `${lcp}ms`,
      FID: `${fid}ms`,
      CLS: cls.toFixed(3),
      TTFB: `${ttfb}ms`,
    });
  }
  
  // Send to analytics in production
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to analytics service
    // Example: sendToAnalytics('web-vitals', metric);
  }
}

/**
 * Prefetch Strategy
 */
export const PREFETCH_CONFIG = {
  // Routes to prefetch on hover
  hoverPrefetch: true,
  
  // Routes to prefetch on mount
  mountPrefetch: [
    '/dashboard',
    '/exchange',
  ],
  
  // Delay before prefetch (ms)
  prefetchDelay: 100,
} as const;

/**
 * Critical CSS Extraction
 */
export function extractCriticalCSS(html: string): string {
  // این تابع در build time استفاده می‌شود
  // برای extract کردن CSS های critical بالای fold
  
  // TODO: Implement critical CSS extraction
  // می‌تواند با tools مثل critical یا critters انجام شود
  
  return html;
}

/**
 * Lazy Load Component Helper
 */
export function lazyLoadComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options?: {
    delay?: number;
    fallback?: React.ReactNode;
  }
) {
  const delay = options?.delay ?? LAZY_LOAD_CONFIG.componentDelay;
  
  return async () => {
    // Add artificial delay if needed
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    return importFunc();
  };
}

/**
 * Image Preload Helper
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
 * Font Preload Helper
 */
export function preloadFont(href: string, type: string = 'font/woff2') {
  if (typeof window === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = type;
  link.href = href;
  link.crossOrigin = 'anonymous';
  
  document.head.appendChild(link);
}

/**
 * Viewport Detection
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Debounce Helper for Performance
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle Helper for Performance
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Request Idle Callback Polyfill
 */
export const requestIdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (cb: IdleRequestCallback) => setTimeout(cb, 1);

/**
 * Cancel Idle Callback Polyfill
 */
export const cancelIdleCallback =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? window.cancelIdleCallback
    : (id: number) => clearTimeout(id);
