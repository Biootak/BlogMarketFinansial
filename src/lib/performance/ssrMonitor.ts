/**
 * SSR Performance Monitor
 * اندازه‌گیری عملکرد Server-Side Rendering
 */

export interface ComponentTiming {
  name: string;
  duration: number;
  children: ComponentTiming[];
}

export interface FetchPattern {
  type: 'sequential' | 'parallel';
  fetches: FetchInfo[];
  totalDuration: number;
  potentialDuration: number;
  suggestion: string;
}

export interface FetchInfo {
  url: string;
  duration: number;
  timestamp: number;
  stackTrace: string[];
}

export interface SSRMetrics {
  route: string;
  renderTime: number;
  dataFetchTime: number;
  ttfb: number;
  componentBreakdown: ComponentTiming[];
  fetchPatterns: FetchPattern[];
  timestamp: Date;
}

export class SSRMonitor {
  private enabled = false;
  private currentRoute = '';
  private renderStart = 0;
  private fetches: FetchInfo[] = [];
  private componentTimings: Map<string, number> = new Map();

  /**
   * شروع اندازه‌گیری render یک صفحه
   */
  startPageRender(route: string): void {
    this.currentRoute = route;
    this.renderStart = performance.now();
    this.fetches = [];
    this.componentTimings.clear();
    this.enabled = true;
  }

  /**
   * پایان اندازه‌گیری و تولید metrics
   */
  async measurePageRender(route: string): Promise<SSRMetrics> {
    const renderTime = performance.now() - this.renderStart;
    const dataFetchTime = this.calculateTotalFetchTime();
    const ttfb = this.measureTTFB();
    const componentBreakdown = this.buildComponentBreakdown();
    const fetchPatterns = this.identifySequentialFetches();

    this.enabled = false;

    return {
      route,
      renderTime,
      dataFetchTime,
      ttfb,
      componentBreakdown,
      fetchPatterns,
      timestamp: new Date(),
    };
  }

  /**
   * ثبت یک data fetch
   */
  trackDataFetching(url: string, duration: number): void {
    if (!this.enabled) return;

    this.fetches.push({
      url,
      duration,
      timestamp: Date.now(),
      stackTrace: this.captureStackTrace(),
    });
  }

  /**
   * شناسایی fetch های sequential که می‌توانند parallel شوند
   */
  identifySequentialFetches(): FetchPattern[] {
    const patterns: FetchPattern[] = [];

    if (this.fetches.length < 2) return patterns;

    // Group fetches by time proximity
    const groups: FetchInfo[][] = [];
    let currentGroup: FetchInfo[] = [this.fetches[0]];

    for (let i = 1; i < this.fetches.length; i++) {
      const timeDiff = this.fetches[i].timestamp - this.fetches[i - 1].timestamp;

      // If fetches are within 50ms, they're likely sequential
      if (timeDiff < 50) {
        currentGroup.push(this.fetches[i]);
      } else {
        if (currentGroup.length > 1) {
          groups.push(currentGroup);
        }
        currentGroup = [this.fetches[i]];
      }
    }

    if (currentGroup.length > 1) {
      groups.push(currentGroup);
    }

    // Analyze each group
    for (const group of groups) {
      const totalDuration = group.reduce((sum, f) => sum + f.duration, 0);
      const maxDuration = Math.max(...group.map((f) => f.duration));

      // If running in parallel, duration would be max instead of sum
      const potentialSaving = totalDuration - maxDuration;

      if (potentialSaving > 100) {
        // Significant saving potential
        patterns.push({
          type: 'sequential',
          fetches: group,
          totalDuration,
          potentialDuration: maxDuration,
          suggestion: this.generateParallelizationSuggestion(group),
        });
      }
    }

    return patterns;
  }

  /**
   * اندازه‌گیری TTFB
   */
  measureTTFB(): number {
    // در محیط سرور، از performance API استفاده می‌کنیم
    if (typeof performance !== 'undefined' && performance.timing) {
      const timing = performance.timing;
      return timing.responseStart - timing.requestStart;
    }

    // Fallback: estimate from render start
    return this.renderStart;
  }

  /**
   * ثبت timing یک component
   */
  trackComponentTiming(name: string, duration: number): void {
    if (!this.enabled) return;
    this.componentTimings.set(name, duration);
  }

  /**
   * ساخت component breakdown tree
   */
  private buildComponentBreakdown(): ComponentTiming[] {
    const breakdown: ComponentTiming[] = [];

    for (const [name, duration] of this.componentTimings.entries()) {
      breakdown.push({
        name,
        duration,
        children: [],
      });
    }

    // Sort by duration (slowest first)
    return breakdown.sort((a, b) => b.duration - a.duration);
  }

  /**
   * محاسبه کل زمان fetch ها
   */
  private calculateTotalFetchTime(): number {
    return this.fetches.reduce((sum, f) => sum + f.duration, 0);
  }

  /**
   * تولید پیشنهاد برای parallelization
   */
  private generateParallelizationSuggestion(fetches: FetchInfo[]): string {
    const urls = fetches.map((f) => f.url).join(', ');

    return `این fetch ها به صورت sequential اجرا می‌شوند و می‌توانند parallel شوند:

// بجای:
const data1 = await fetch('${fetches[0].url}');
const data2 = await fetch('${fetches[1]?.url || 'url2'}');

// استفاده کنید از:
const [data1, data2] = await Promise.all([
  fetch('${fetches[0].url}'),
  fetch('${fetches[1]?.url || 'url2'}')
]);

سود مورد انتظار: کاهش ${((1 - Math.max(...fetches.map((f) => f.duration)) / fetches.reduce((sum, f) => sum + f.duration, 0)) * 100).toFixed(0)}% در زمان fetch`;
  }

  /**
   * Capture stack trace
   */
  private captureStackTrace(): string[] {
    const stack = new Error().stack || '';
    return stack
      .split('\n')
      .slice(3)
      .map((line) => line.trim())
      .filter((line) => !line.includes('node_modules'))
      .slice(0, 5);
  }

  /**
   * بررسی الگوهای data fetching
   */
  analyzeDataFetchingPatterns(): {
    hasSequentialFetches: boolean;
    hasUnnecessaryClientComponents: boolean;
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    const hasSequentialFetches = this.identifySequentialFetches().length > 0;

    if (hasSequentialFetches) {
      suggestions.push('استفاده از Promise.all برای fetch های موازی');
    }

    if (this.fetches.length > 10) {
      suggestions.push('تعداد fetch ها زیاد است. استفاده از GraphQL یا data aggregation را در نظر بگیرید');
    }

    return {
      hasSequentialFetches,
      hasUnnecessaryClientComponents: false, // این نیاز به تحلیل استاتیک کد دارد
      suggestions,
    };
  }

  /**
   * دریافت آمار فعلی
   */
  getStats() {
    return {
      currentRoute: this.currentRoute,
      totalFetches: this.fetches.length,
      totalFetchTime: this.calculateTotalFetchTime(),
      componentCount: this.componentTimings.size,
      enabled: this.enabled,
    };
  }

  /**
   * پاک کردن داده‌های جمع‌آوری شده
   */
  clear(): void {
    this.fetches = [];
    this.componentTimings.clear();
    this.enabled = false;
  }
}

// Singleton instance
export const ssrMonitor = new SSRMonitor();
