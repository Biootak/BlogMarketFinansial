'use client';

/**
 * Performance Dashboard Component
 * Shows real-time performance metrics during development
 */

import { getPerformanceMonitor } from '@/lib/performance/performance-monitor';
import { checkPerformanceTargets, getMetricsSnapshot } from '@/lib/performance/web-vitals';
import type { WebVitalsMetrics } from '@/lib/performance/web-vitals';
import { useEffect, useState } from 'react';

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<Partial<WebVitalsMetrics>>({});
  const [issues, setIssues] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;

    // Update metrics every 2 seconds
    const interval = setInterval(() => {
      const snapshot = getMetricsSnapshot();
      setMetrics(snapshot);

      const monitor = getPerformanceMonitor();
      setIssues(monitor.getIssues());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Don't render in production
  if (process.env.NODE_ENV !== 'development') return null;

  const targets = checkPerformanceTargets(metrics);
  const hasMetrics = Object.keys(metrics).length > 0;

  return (
    <div className="fixed bottom-4 start-4 z-50">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-neutral-800"
      >
        <span>⚡</span>
        <span>Performance</span>
        {!targets.overall && hasMetrics && (
          <span className="flex h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>

      {/* Dashboard Panel */}
      {isOpen && (
        <div className="mt-2 w-96 rounded-lg bg-neutral-900 p-4 text-white shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">Performance Metrics</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Core Web Vitals */}
          <div className="space-y-2">
            <MetricRow
              label="LCP"
              value={metrics.lcp}
              target={2500}
              unit="ms"
              passed={targets.lcp}
            />
            <MetricRow
              label="INP"
              value={metrics.inp}
              target={200}
              unit="ms"
              passed={targets.inp}
            />
            <MetricRow label="CLS" value={metrics.cls} target={0.1} unit="" passed={targets.cls} />
            <MetricRow
              label="TTFB"
              value={metrics.ttfb}
              target={800}
              unit="ms"
              passed={targets.ttfb}
            />
            <MetricRow
              label="FCP"
              value={metrics.fcp}
              target={1800}
              unit="ms"
              passed={metrics.fcp ? metrics.fcp <= 1800 : true}
            />
          </div>

          {/* Performance Issues */}
          {issues.length > 0 && (
            <div className="mt-4 border-t border-neutral-700 pt-4">
              <h4 className="mb-2 text-sm font-semibold">Issues ({issues.length})</h4>
              <div className="max-h-40 space-y-1 overflow-y-auto text-xs">
                {issues.slice(-5).map((issue, index) => (
                  <div key={index} className="rounded bg-neutral-800 p-2">
                    <div className="flex items-center gap-2">
                      <span className={getSeverityColor(issue.severity)}>●</span>
                      <span className="font-medium">{issue.type}</span>
                    </div>
                    <div className="mt-1 text-neutral-400">{issue.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overall Status */}
          <div className="mt-4 border-t border-neutral-700 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Status</span>
              <span
                className={`rounded px-2 py-1 text-xs font-bold ${
                  targets.overall ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {targets.overall ? '✓ Good' : '✗ Needs Improvement'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricRow({
  label,
  value,
  target,
  unit,
  passed,
}: {
  label: string;
  value?: number;
  target: number;
  unit: string;
  passed: boolean;
}) {
  const displayValue = value !== undefined ? value.toFixed(value < 1 ? 3 : 0) : '-';
  const color =
    value === undefined ? 'text-neutral-500' : passed ? 'text-green-400' : 'text-red-400';

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-neutral-300">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`font-mono ${color}`}>
          {displayValue}
          {unit}
        </span>
        <span className="text-xs text-neutral-500">
          (target: {target}
          {unit})
        </span>
      </div>
    </div>
  );
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'text-red-500';
    case 'high':
      return 'text-orange-500';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-blue-500';
    default:
      return 'text-neutral-500';
  }
}
