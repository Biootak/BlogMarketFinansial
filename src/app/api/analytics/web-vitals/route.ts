/**
 * API endpoint for receiving Web Vitals metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import type { PerformanceReport } from '@/lib/performance/web-vitals';

export async function POST(request: NextRequest) {
  try {
    const report: PerformanceReport = await request.json();

    // Log metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 [Web Vitals Report]', {
        url: report.url,
        device: report.device,
        metrics: report.metrics,
      });
    }

    // In production, you would:
    // 1. Store metrics in database
    // 2. Send to analytics service (Google Analytics, Vercel Analytics, etc.)
    // 3. Trigger alerts if metrics exceed thresholds

    // Example: Check if metrics meet targets
    const targets = {
      lcp: report.metrics.lcp ? report.metrics.lcp <= 2500 : true,
      inp: report.metrics.inp ? report.metrics.inp <= 200 : true,
      cls: report.metrics.cls ? report.metrics.cls <= 0.1 : true,
      ttfb: report.metrics.ttfb ? report.metrics.ttfb <= 800 : true,
    };

    const failedMetrics = Object.entries(targets)
      .filter(([_, passed]) => !passed)
      .map(([metric]) => metric);

    if (failedMetrics.length > 0) {
      console.warn('⚠️ [Performance Warning] Metrics below target:', failedMetrics);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to process web vitals:', error);
    return NextResponse.json({ error: 'Failed to process metrics' }, { status: 500 });
  }
}
