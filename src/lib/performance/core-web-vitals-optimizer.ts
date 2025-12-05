/**
 * Core Web Vitals Optimizer
 * Strategies to improve LCP, FID, CLS, TTFB, and INP
 */

/**
 * LCP Optimization Strategies
 * Target: <= 2.5s
 */
export const lcpOptimizations = {
  /**
   * Preload critical resources
   */
  preloadCriticalResources(resources: Array<{ href: string; as: string }>): void {
    if (typeof document === 'undefined') return;

    resources.forEach(({ href, as }) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      if (as === 'font') {
        link.crossOrigin = 'anonymous';
      }
      document.head.appendChild(link);
    });
  },

  /**
   * Prioritize above-fold images
   */
  prioritizeAboveFoldImages(): void {
    if (typeof document === 'undefined') return;

    const images = document.querySelectorAll('img[data-priority="true"]');
    images.forEach((img) => {
      img.setAttribute('fetchpriority', 'high');
      img.setAttribute('loading', 'eager');
    });
  },

  /**
   * Inline critical CSS
   */
  inlineCriticalCSS(css: string): void {
    if (typeof document === 'undefined') return;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  },
};

/**
 * FID Optimization Strategies
 * Target: <= 100ms
 */
export const fidOptimizations = {
  /**
   * Defer non-critical JavaScript
   */
  deferNonCriticalJS(): void {
    if (typeof document === 'undefined') return;

    const scripts = document.querySelectorAll('script[data-defer="true"]');
    scripts.forEach((script) => {
      script.setAttribute('defer', '');
    });
  },

  /**
   * Break up long tasks
   */
  async breakUpLongTask<T>(task: () => T): Promise<T> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(task());
      }, 0);
    });
  },

  /**
   * Use requestIdleCallback for non-critical work
   */
  scheduleIdleWork(callback: () => void): void {
    if (typeof window === 'undefined') return;

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(callback);
    } else {
      setTimeout(callback, 1);
    }
  },
};

/**
 * CLS Optimization Strategies
 * Target: <= 0.1
 */
export const clsOptimizations = {
  /**
   * Reserve space for images
   */
  reserveImageSpace(img: HTMLImageElement, aspectRatio: string): void {
    const [width, height] = aspectRatio.split('/').map(Number);
    const ratio = height / width;
    
    img.style.aspectRatio = aspectRatio;
    img.style.width = '100%';
    img.style.height = 'auto';
  },

  /**
   * Reserve space for ads
   */
  reserveAdSpace(container: HTMLElement, height: number): void {
    container.style.minHeight = `${height}px`;
  },

  /**
   * Prevent font swap layout shift
   */
  preventFontSwap(): void {
    if (typeof document === 'undefined') return;

    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-display: swap;
      }
    `;
    document.head.appendChild(style);
  },

  /**
   * Add dimensions to dynamic content
   */
  addDimensions(element: HTMLElement, width: number, height: number): void {
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
  },
};

/**
 * TTFB Optimization Strategies
 * Target: <= 800ms
 */
export const ttfbOptimizations = {
  /**
   * Use CDN for static assets
   */
  useCDN: true,

  /**
   * Enable compression
   */
  enableCompression: true,

  /**
   * Use HTTP/2
   */
  useHTTP2: true,

  /**
   * Optimize server response time
   */
  cacheHeaders: {
    static: 'public, max-age=31536000, immutable',
    dynamic: 'public, max-age=3600, stale-while-revalidate=86400',
  },
};

/**
 * INP Optimization Strategies
 * Target: <= 200ms
 */
export const inpOptimizations = {
  /**
   * Debounce expensive operations
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * Throttle scroll handlers
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Use passive event listeners
   */
  addPassiveListener(
    element: HTMLElement,
    event: string,
    handler: EventListener
  ): void {
    element.addEventListener(event, handler, { passive: true });
  },
};

/**
 * Apply all optimizations
 */
export function applyAllOptimizations(): void {
  // LCP optimizations
  lcpOptimizations.prioritizeAboveFoldImages();

  // FID optimizations
  fidOptimizations.deferNonCriticalJS();

  // CLS optimizations
  clsOptimizations.preventFontSwap();
}

/**
 * Monitor Core Web Vitals and apply optimizations
 */
export function monitorAndOptimize(): void {
  if (typeof window === 'undefined') return;

  // Apply optimizations on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAllOptimizations);
  } else {
    applyAllOptimizations();
  }
}
