/**
 * Client Performance Monitor
 * اندازه‌گیری Core Web Vitals و client-side metrics
 */

'use client';

export interface WebVitals {
  lcp: number;
  fid: number;
  cls: number;
  inp: number;
  ttfb: number;
}

export interface LongTask {
  name: string;
  duration: number;
  startTime: number;
  attribution?: string;
}

export interface LayoutShift {
  value: number;
  sources: LayoutShiftSource[];
  timestamp: number;
}

export interface LayoutShiftSource {
  node: string;
  previousRect: DOMRect | null;
  currentRect: DOMRect | null;
}

export interface ClientMetrics extends WebVitals {
  hydrationTime: number;
  longTasks: LongTask[];
  layoutShifts: LayoutShift[];
  lcpElement?: string;
  timestamp: Date;
}

export class ClientMonitor {
  private metrics: Partial<ClientMetrics> = {};
  private hydrationStart = 0;
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.hydrationStart = performance.now();
      this.initializeObservers();
    }
  }

  /**
   * اندازه‌گیری Web Vitals
   */
  async measureWebVitals(): Promise<WebVitals> {
    // استفاده از web-vitals library
    const { onCLS, onFID, onLCP, onINP, onTTFB } = await import('web-vitals');

    return new Promise((resolve) => {
      const vitals: Partial<WebVitals> = {};

      onCLS((metric) => {
        vitals.cls = metric.value;
        this.checkIfComplete(vitals, resolve);
      });

      onFID((metric) => {
        vitals.fid = metric.value;
        this.checkIfComplete(vitals, resolve);
      });

      onLCP((metric) => {
        vitals.lcp = metric.value;
        this.checkIfComplete(vitals, resolve);
      });

      onINP((metric) => {
        vitals.inp = metric.value;
        this.checkIfComplete(vitals, resolve);
      });

      onTTFB((metric) => {
        vitals.ttfb = metric.value;
        this.checkIfComplete(vitals, resolve);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        resolve(vitals as WebVitals);
      }, 10000);
    });
  }

  /**
   * ردیابی hydration time
   */
  trackHydration(): number {
    const hydrationTime = performance.now() - this.hydrationStart;
    this.metrics.hydrationTime = hydrationTime;

    if (hydrationTime > 1000) {
      console.warn(`⚠️ Slow hydration detected: ${hydrationTime.toFixed(2)}ms`);
    }

    return hydrationTime;
  }

  /**
   * شناسایی long tasks
   */
  identifyLongTasks(): LongTask[] {
    return this.metrics.longTasks || [];
  }

  /**
   * ردیابی layout shifts
   */
  trackLayoutShifts(): LayoutShift[] {
    return this.metrics.layoutShifts || [];
  }

  /**
   * ارسال metrics به analytics
   */
  async sendToAnalytics(metrics: ClientMetrics): Promise<void> {
    try {
      // ارسال به API endpoint
      await fetch('/api/performance/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...metrics,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
    }
  }

  /**
   * تحلیل LCP و ارائه پیشنهادات
   */
  analyzeLCP(lcp: number, element?: Element): {
    isGood: boolean;
    suggestions: string[];
  } {
    const suggestions: string[] = [];

    if (lcp > 2500) {
      suggestions.push('LCP بیش از حد مجاز است (>2.5s)');

      if (element) {
        const tagName = element.tagName.toLowerCase();

        if (tagName === 'img') {
          suggestions.push('استفاده از next/image برای بهینه‌سازی تصویر');
          suggestions.push('اضافه کردن priority prop برای تصاویر بالای صفحه');
          suggestions.push('استفاده از فرمت WebP یا AVIF');
        }

        if (element.textContent && element.textContent.length > 1000) {
          suggestions.push('محتوای متنی بزرگ است. استفاده از code splitting');
        }
      }

      suggestions.push('بررسی زمان پاسخ سرور (TTFB)');
      suggestions.push('استفاده از CDN برای منابع استاتیک');
    }

    return {
      isGood: lcp <= 2500,
      suggestions,
    };
  }

  /**
   * تحلیل CLS و شناسایی عناصر مشکل‌دار
   */
  analyzeCLS(cls: number, shifts: LayoutShift[]): {
    isGood: boolean;
    problematicElements: string[];
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    const problematicElements: string[] = [];

    if (cls > 0.1) {
      suggestions.push('CLS بیش از حد مجاز است (>0.1)');

      // Analyze shift sources
      for (const shift of shifts) {
        for (const source of shift.sources) {
          if (!problematicElements.includes(source.node)) {
            problematicElements.push(source.node);
          }
        }
      }

      suggestions.push('اضافه کردن width و height به تصاویر');
      suggestions.push('رزرو کردن فضا برای تبلیغات و embeds');
      suggestions.push('استفاده از font-display: swap برای فونت‌ها');
      suggestions.push('اجتناب از اضافه کردن محتوا بالای محتوای موجود');
    }

    return {
      isGood: cls <= 0.1,
      problematicElements,
      suggestions,
    };
  }

  /**
   * Initialize Performance Observers
   */
  private initializeObservers(): void {
    // Long Tasks Observer
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              if (!this.metrics.longTasks) {
                this.metrics.longTasks = [];
              }

              this.metrics.longTasks.push({
                name: entry.name,
                duration: entry.duration,
                startTime: entry.startTime,
                attribution: (entry as any).attribution?.[0]?.name,
              });

              console.warn(`🐌 Long task detected: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
            }
          }
        });

        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (e) {
        // Long task API not supported
      }

      // Layout Shift Observer
      try {
        const layoutShiftObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShiftEntry = entry as any;

            if (!this.metrics.layoutShifts) {
              this.metrics.layoutShifts = [];
            }

            this.metrics.layoutShifts.push({
              value: layoutShiftEntry.value,
              sources: (layoutShiftEntry.sources || []).map((source: any) => ({
                node: source.node?.tagName || 'unknown',
                previousRect: source.previousRect,
                currentRect: source.currentRect,
              })),
              timestamp: entry.startTime,
            });
          }
        });

        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(layoutShiftObserver);
      } catch (e) {
        // Layout shift API not supported
      }

      // LCP Observer
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;

          if (lastEntry) {
            this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
            this.metrics.lcpElement = lastEntry.element?.tagName || 'unknown';
          }
        });

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        // LCP API not supported
      }
    }
  }

  /**
   * Check if all vitals are collected
   */
  private checkIfComplete(vitals: Partial<WebVitals>, resolve: (value: WebVitals) => void): void {
    if (vitals.lcp && vitals.fid && vitals.cls && vitals.inp && vitals.ttfb) {
      resolve(vitals as WebVitals);
    }
  }

  /**
   * دریافت تمام metrics جمع‌آوری شده
   */
  getAllMetrics(): Partial<ClientMetrics> {
    return {
      ...this.metrics,
      timestamp: new Date(),
    };
  }

  /**
   * پاک کردن observers
   */
  cleanup(): void {
    for (const observer of this.observers) {
      observer.disconnect();
    }
    this.observers = [];
  }
}

// Singleton instance
let clientMonitorInstance: ClientMonitor | null = null;

export function getClientMonitor(): ClientMonitor {
  if (typeof window === 'undefined') {
    throw new Error('ClientMonitor can only be used in browser environment');
  }

  if (!clientMonitorInstance) {
    clientMonitorInstance = new ClientMonitor();
  }

  return clientMonitorInstance;
}
