/**
 * Performance Monitoring - Main Export
 */

export {
  initWebVitals,
  reportWebVitals,
  getMetricsSnapshot,
  checkPerformanceTargets,
  type WebVitalsMetrics,
  type PerformanceReport,
} from './web-vitals';

export {
  PerformanceMonitor,
  getPerformanceMonitor,
  initPerformanceMonitoring,
  type PerformanceTimings,
  type LongTaskInfo,
  type PerformanceIssue,
} from './performance-monitor';

/**
 * Initialize all performance monitoring
 * Call this once in your app's root
 */
export async function initPerformance(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Initialize Web Vitals monitoring
  const { initWebVitals } = await import('./web-vitals');
  await initWebVitals();

  // Initialize Performance Monitor
  const { initPerformanceMonitoring } = await import('./performance-monitor');
  initPerformanceMonitoring();
}
