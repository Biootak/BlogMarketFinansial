/**
 * Performance Monitoring System
 * Tracks performance degradation and logs detailed timing information
 */

export interface PerformanceTimings {
  navigationStart: number;
  domContentLoaded: number;
  domComplete: number;
  loadComplete: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
}

export interface LongTaskInfo {
  startTime: number;
  duration: number;
  attribution?: string;
}

export interface PerformanceIssue {
  type: 'slow-render' | 'long-task' | 'memory-leak' | 'large-bundle';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  timestamp: Date;
}

/**
 * Performance thresholds
 */
const THRESHOLDS = {
  LONG_TASK: 50, // ms - tasks longer than this are considered slow
  SLOW_RENDER: 16, // ms - renders longer than this cause frame drops
  MEMORY_LEAK: 50 * 1024 * 1024, // 50MB - memory growth threshold
  LARGE_BUNDLE: 200 * 1024, // 200KB - bundle size threshold
} as const;

/**
 * Performance Monitor class
 */
export class PerformanceMonitor {
  private issues: PerformanceIssue[] = [];
  private longTaskObserver?: PerformanceObserver;
  private memoryCheckInterval?: NodeJS.Timeout;

  /**
   * Start monitoring performance
   */
  start(): void {
    if (typeof window === 'undefined') return;

    this.monitorLongTasks();
    this.monitorMemory();
    this.logNavigationTimings();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.longTaskObserver?.disconnect();
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
  }

  /**
   * Monitor long tasks that block the main thread
   */
  private monitorLongTasks(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > THRESHOLDS.LONG_TASK) {
            const issue: PerformanceIssue = {
              type: 'long-task',
              severity: entry.duration > 100 ? 'high' : 'medium',
              message: `Long task detected: ${entry.duration.toFixed(2)}ms`,
              details: {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name,
              },
              timestamp: new Date(),
            };

            this.reportIssue(issue);
          }
        }
      });

      this.longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('Long task monitoring not supported:', error);
    }
  }

  /**
   * Monitor memory usage for potential leaks
   */
  private monitorMemory(): void {
    if (!('memory' in performance)) return;

    const initialMemory = (performance as any).memory.usedJSHeapSize;
    let lastMemory = initialMemory;

    this.memoryCheckInterval = setInterval(() => {
      const currentMemory = (performance as any).memory.usedJSHeapSize;
      const growth = currentMemory - lastMemory;

      if (growth > THRESHOLDS.MEMORY_LEAK) {
        const issue: PerformanceIssue = {
          type: 'memory-leak',
          severity: 'high',
          message: `Potential memory leak: ${(growth / 1024 / 1024).toFixed(2)}MB growth`,
          details: {
            currentMemory,
            growth,
            initialMemory,
          },
          timestamp: new Date(),
        };

        this.reportIssue(issue);
      }

      lastMemory = currentMemory;
    }, 30000); // Check every 30 seconds
  }

  /**
   * Log navigation timing information
   */
  private logNavigationTimings(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = performance.timing;
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        const timings: PerformanceTimings = {
          navigationStart: timing.navigationStart,
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          domComplete: timing.domComplete - timing.navigationStart,
          loadComplete: timing.loadEventEnd - timing.navigationStart,
        };

        // Get paint timings
        const paintEntries = performance.getEntriesByType('paint');
        for (const entry of paintEntries) {
          if (entry.name === 'first-paint') {
            timings.firstPaint = entry.startTime;
          } else if (entry.name === 'first-contentful-paint') {
            timings.firstContentfulPaint = entry.startTime;
          }
        }

        this.logTimings(timings);

        // Check for slow page load
        if (timings.loadComplete > 3000) {
          const issue: PerformanceIssue = {
            type: 'slow-render',
            severity: timings.loadComplete > 5000 ? 'high' : 'medium',
            message: `Slow page load: ${timings.loadComplete}ms`,
            details: timings,
            timestamp: new Date(),
          };

          this.reportIssue(issue);
        }
      }, 0);
    });
  }

  /**
   * Log timing information
   */
  private logTimings(timings: PerformanceTimings): void {
    if (process.env.NODE_ENV === 'development') {
      console.group('⚡ Performance Timings');
      console.log('DOM Content Loaded:', `${timings.domContentLoaded}ms`);
      console.log('DOM Complete:', `${timings.domComplete}ms`);
      console.log('Load Complete:', `${timings.loadComplete}ms`);
      if (timings.firstPaint) {
        console.log('First Paint:', `${timings.firstPaint}ms`);
      }
      if (timings.firstContentfulPaint) {
        console.log('First Contentful Paint:', `${timings.firstContentfulPaint}ms`);
      }
      console.groupEnd();
    }
  }

  /**
   * Report performance issue
   */
  private reportIssue(issue: PerformanceIssue): void {
    this.issues.push(issue);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      const emoji = issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : '🟡';
      console.warn(`${emoji} [Performance Issue]`, issue.message, issue.details);
    }

    // Send to error tracking in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorTracking(issue);
    }
  }

  /**
   * Send issue to error tracking service
   */
  private async sendToErrorTracking(issue: PerformanceIssue): Promise<void> {
    try {
      await fetch('/api/analytics/performance-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...issue,
          url: window.location.href,
          userAgent: navigator.userAgent,
          device: this.getDeviceInfo(),
        }),
        keepalive: true,
      });
    } catch (error) {
      console.error('Failed to send performance issue:', error);
    }
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): Record<string, any> {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      connection: (navigator as any).connection?.effectiveType || 'unknown',
    };
  }

  /**
   * Get all recorded issues
   */
  getIssues(): PerformanceIssue[] {
    return [...this.issues];
  }

  /**
   * Clear recorded issues
   */
  clearIssues(): void {
    this.issues = [];
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  } {
    return {
      totalIssues: this.issues.length,
      criticalIssues: this.issues.filter((i) => i.severity === 'critical').length,
      highIssues: this.issues.filter((i) => i.severity === 'high').length,
      mediumIssues: this.issues.filter((i) => i.severity === 'medium').length,
      lowIssues: this.issues.filter((i) => i.severity === 'low').length,
    };
  }
}

/**
 * Global performance monitor instance
 */
let globalMonitor: PerformanceMonitor | null = null;

/**
 * Get or create global performance monitor
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring(): void {
  if (typeof window === 'undefined') return;
  
  const monitor = getPerformanceMonitor();
  monitor.start();

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    monitor.stop();
  });
}
