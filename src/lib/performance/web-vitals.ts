/**
 * Web Vitals Monitoring Utility
 * Collects and reports Core Web Vitals metrics
 */

import type { Metric } from 'web-vitals';

export interface WebVitalsMetrics {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  inp: number; // Interaction to Next Paint
  fcp: number; // First Contentful Paint
}

export interface PerformanceReport {
  id: string;
  timestamp: Date;
  url: string;
  device: 'mobile' | 'tablet' | 'desktop';
  connection: string;
  metrics: Partial<WebVitalsMetrics>;
  userAgent: string;
}

/**
 * Determine device type based on viewport width
 */
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Get connection type from Network Information API
 */
function getConnectionType(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  return connection?.effectiveType || 'unknown';
}

/**
 * Generate unique ID for performance report
 */
function generateReportId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Send metrics to analytics endpoint
 */
async function sendToAnalytics(report: PerformanceReport): Promise<void> {
  try {
    // Use sendBeacon for reliability (doesn't block page unload)
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(report)], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/web-vitals', blob);
    } else {
      // Fallback to fetch
      await fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
        keepalive: true,
      });
    }
  } catch (error) {
    console.error('Failed to send web vitals:', error);
  }
}

/**
 * Store for collecting metrics before sending
 */
const metricsStore: Partial<WebVitalsMetrics> = {};

/**
 * Report metric to analytics
 */
export function reportWebVitals(metric: Metric): void {
  // Store metric
  metricsStore[metric.name.toLowerCase() as keyof WebVitalsMetrics] = metric.value;

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, metric.value, metric.rating);
  }

  // Create performance report
  const report: PerformanceReport = {
    id: generateReportId(),
    timestamp: new Date(),
    url: window.location.href,
    device: getDeviceType(),
    connection: getConnectionType(),
    metrics: { ...metricsStore },
    userAgent: navigator.userAgent,
  };

  // Send to analytics
  sendToAnalytics(report);
}

/**
 * Initialize Web Vitals monitoring
 * Call this in your app's root component or _app.tsx
 */
export async function initWebVitals(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const { onCLS, onFID, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals');

    // Monitor all Core Web Vitals
    onCLS(reportWebVitals);
    onFID(reportWebVitals);
    onFCP(reportWebVitals);
    onLCP(reportWebVitals);
    onTTFB(reportWebVitals);
    onINP(reportWebVitals);
  } catch (error) {
    console.error('Failed to initialize web vitals:', error);
  }
}

/**
 * Get current metrics snapshot
 */
export function getMetricsSnapshot(): Partial<WebVitalsMetrics> {
  return { ...metricsStore };
}

/**
 * Check if metrics meet performance targets
 */
export function checkPerformanceTargets(metrics: Partial<WebVitalsMetrics>): {
  lcp: boolean;
  fid: boolean;
  cls: boolean;
  ttfb: boolean;
  inp: boolean;
  overall: boolean;
} {
  const targets = {
    lcp: metrics.lcp ? metrics.lcp <= 2500 : true, // 2.5s
    fid: metrics.fid ? metrics.fid <= 100 : true, // 100ms
    cls: metrics.cls ? metrics.cls <= 0.1 : true, // 0.1
    ttfb: metrics.ttfb ? metrics.ttfb <= 800 : true, // 800ms
    inp: metrics.inp ? metrics.inp <= 200 : true, // 200ms
  };

  return {
    ...targets,
    overall: Object.values(targets).every(Boolean),
  };
}
