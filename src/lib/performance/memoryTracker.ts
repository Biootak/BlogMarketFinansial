/**
 * Memory Tracker
 * ردیابی مصرف حافظه و شناسایی memory leaks
 */

'use client';

export interface MemoryMetrics {
  heapSize: number;
  usedHeap: number;
  heapLimit: number;
  gcFrequency: number;
  potentialLeaks: LeakSuspect[];
  timestamp: Date;
}

export interface LeakSuspect {
  component: string;
  type: 'event-listener' | 'timer' | 'subscription' | 'dom-node';
  location: string;
  description: string;
}

export interface HeapAnalysis {
  totalSize: number;
  usedSize: number;
  freeSize: number;
  largestObjects: HeapObject[];
}

export interface HeapObject {
  type: string;
  size: number;
  count: number;
}

export interface GCMetrics {
  collections: number;
  avgDuration: number;
  totalPause: number;
}

export class MemoryTracker {
  private enabled = false;
  private measurements: MemoryMetrics[] = [];
  private gcCount = 0;
  private eventListeners = new Map<string, number>();
  private timers = new Set<number>();
  private subscriptions = new Set<any>();
  private monitoringInterval: NodeJS.Timeout | null = null;

  /**
   * ردیابی مصرف حافظه
   */
  trackMemoryUsage(): MemoryMetrics {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      throw new Error('Memory API not available');
    }

    const memory = (performance as any).memory;

    const metrics: MemoryMetrics = {
      heapSize: memory.totalJSHeapSize,
      usedHeap: memory.usedJSHeapSize,
      heapLimit: memory.jsHeapSizeLimit,
      gcFrequency: this.gcCount,
      potentialLeaks: this.detectLeaks(),
      timestamp: new Date(),
    };

    this.measurements.push(metrics);

    // Keep only last 100 measurements
    if (this.measurements.length > 100) {
      this.measurements.shift();
    }

    return metrics;
  }

  /**
   * شناسایی memory leaks
   */
  detectLeaks(): LeakSuspect[] {
    const suspects: LeakSuspect[] = [];

    // Check for continuous memory growth
    if (this.measurements.length >= 10) {
      const recent = this.measurements.slice(-10);
      const isGrowing = recent.every((m, i) => i === 0 || m.usedHeap > recent[i - 1].usedHeap);

      if (isGrowing) {
        const growth = recent[recent.length - 1].usedHeap - recent[0].usedHeap;
        const growthRate = (growth / recent[0].usedHeap) * 100;

        if (growthRate > 20) {
          // More than 20% growth
          suspects.push({
            component: 'Global',
            type: 'dom-node',
            location: 'Memory continuously growing',
            description: `حافظه به صورت مداوم در حال رشد است (${growthRate.toFixed(1)}% در 10 اندازه‌گیری اخیر)`,
          });
        }
      }
    }

    // Check for excessive event listeners
    for (const [event, count] of this.eventListeners.entries()) {
      if (count > 50) {
        suspects.push({
          component: 'EventListeners',
          type: 'event-listener',
          location: event,
          description: `تعداد زیاد event listener برای ${event} (${count} عدد)`,
        });
      }
    }

    // Check for excessive timers
    if (this.timers.size > 20) {
      suspects.push({
        component: 'Timers',
        type: 'timer',
        location: 'Global',
        description: `تعداد زیاد timer فعال (${this.timers.size} عدد)`,
      });
    }

    return suspects;
  }

  /**
   * تحلیل heap snapshot
   */
  analyzeHeapSnapshot(): HeapAnalysis {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      throw new Error('Memory API not available');
    }

    const memory = (performance as any).memory;

    return {
      totalSize: memory.totalJSHeapSize,
      usedSize: memory.usedJSHeapSize,
      freeSize: memory.totalJSHeapSize - memory.usedJSHeapSize,
      largestObjects: [], // نیاز به heap profiler API دارد
    };
  }

  /**
   * نظارت بر GC
   */
  monitorGC(): GCMetrics {
    // در مرورگر، دسترسی مستقیم به GC metrics نداریم
    // می‌توانیم از تغییرات ناگهانی در heap استفاده کنیم

    let collections = 0;
    let totalPause = 0;

    for (let i = 1; i < this.measurements.length; i++) {
      const prev = this.measurements[i - 1];
      const curr = this.measurements[i];

      // اگر heap به طور ناگهانی کاهش یافت، احتمالاً GC رخ داده
      if (curr.usedHeap < prev.usedHeap * 0.9) {
        collections++;
        // تخمین زمان pause (معمولاً چند میلی‌ثانیه)
        totalPause += 10;
      }
    }

    return {
      collections,
      avgDuration: collections > 0 ? totalPause / collections : 0,
      totalPause,
    };
  }

  /**
   * ثبت event listener
   */
  registerEventListener(event: string, target: string): void {
    const key = `${target}:${event}`;
    this.eventListeners.set(key, (this.eventListeners.get(key) || 0) + 1);
  }

  /**
   * حذف event listener
   */
  unregisterEventListener(event: string, target: string): void {
    const key = `${target}:${event}`;
    const count = this.eventListeners.get(key) || 0;
    if (count > 1) {
      this.eventListeners.set(key, count - 1);
    } else {
      this.eventListeners.delete(key);
    }
  }

  /**
   * ثبت timer
   */
  registerTimer(id: number): void {
    this.timers.add(id);
  }

  /**
   * حذف timer
   */
  unregisterTimer(id: number): void {
    this.timers.delete(id);
  }

  /**
   * ثبت subscription
   */
  registerSubscription(subscription: any): void {
    this.subscriptions.add(subscription);
  }

  /**
   * حذف subscription
   */
  unregisterSubscription(subscription: any): void {
    this.subscriptions.delete(subscription);
  }

  /**
   * شروع نظارت خودکار
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    this.enabled = true;
    this.monitoringInterval = setInterval(() => {
      try {
        const metrics = this.trackMemoryUsage();

        // Check for memory threshold
        if (metrics.usedHeap > 512 * 1024 * 1024) {
          // 512MB
          console.warn('⚠️ Memory usage exceeds 512MB:', {
            used: this.formatBytes(metrics.usedHeap),
            total: this.formatBytes(metrics.heapSize),
            leaks: metrics.potentialLeaks,
          });
        }

        // Check for leaks
        if (metrics.potentialLeaks.length > 0) {
          console.warn('🔍 Potential memory leaks detected:', metrics.potentialLeaks);
        }
      } catch (error) {
        console.error('Memory tracking error:', error);
      }
    }, intervalMs);

    console.log('✅ Memory monitoring started');
  }

  /**
   * توقف نظارت
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.enabled = false;
      console.log('❌ Memory monitoring stopped');
    }
  }

  /**
   * دریافت آمار فعلی
   */
  getStats() {
    if (this.measurements.length === 0) {
      return null;
    }

    const latest = this.measurements[this.measurements.length - 1];
    const gcMetrics = this.monitorGC();

    return {
      current: {
        used: this.formatBytes(latest.usedHeap),
        total: this.formatBytes(latest.heapSize),
        limit: this.formatBytes(latest.heapLimit),
        percentage: ((latest.usedHeap / latest.heapLimit) * 100).toFixed(1) + '%',
      },
      gc: gcMetrics,
      leaks: latest.potentialLeaks,
      tracking: {
        eventListeners: this.eventListeners.size,
        timers: this.timers.size,
        subscriptions: this.subscriptions.size,
      },
    };
  }

  /**
   * تولید گزارش
   */
  generateReport(): string {
    const stats = this.getStats();
    if (!stats) {
      return 'No memory data collected yet';
    }

    let report = `# گزارش مصرف حافظه\n\n`;
    report += `## وضعیت فعلی\n`;
    report += `- استفاده شده: ${stats.current.used}\n`;
    report += `- کل: ${stats.current.total}\n`;
    report += `- محدودیت: ${stats.current.limit}\n`;
    report += `- درصد: ${stats.current.percentage}\n\n`;

    report += `## Garbage Collection\n`;
    report += `- تعداد: ${stats.gc.collections}\n`;
    report += `- میانگین مدت: ${stats.gc.avgDuration.toFixed(2)}ms\n`;
    report += `- کل توقف: ${stats.gc.totalPause.toFixed(2)}ms\n\n`;

    if (stats.leaks.length > 0) {
      report += `## نشت حافظه احتمالی\n`;
      for (const leak of stats.leaks) {
        report += `- **${leak.component}** (${leak.type})\n`;
        report += `  ${leak.description}\n`;
      }
      report += `\n`;
    }

    report += `## ردیابی منابع\n`;
    report += `- Event Listeners: ${stats.tracking.eventListeners}\n`;
    report += `- Timers: ${stats.tracking.timers}\n`;
    report += `- Subscriptions: ${stats.tracking.subscriptions}\n`;

    return report;
  }

  /**
   * پاک کردن داده‌ها
   */
  clear(): void {
    this.measurements = [];
    this.gcCount = 0;
    this.eventListeners.clear();
    this.timers.clear();
    this.subscriptions.clear();
  }

  /**
   * فرمت کردن bytes
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

// Singleton instance
let memoryTrackerInstance: MemoryTracker | null = null;

export function getMemoryTracker(): MemoryTracker {
  if (typeof window === 'undefined') {
    throw new Error('MemoryTracker can only be used in browser environment');
  }

  if (!memoryTrackerInstance) {
    memoryTrackerInstance = new MemoryTracker();
  }

  return memoryTrackerInstance;
}
