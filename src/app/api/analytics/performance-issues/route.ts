/**
 * API endpoint for receiving performance issues
 */

import { NextRequest, NextResponse } from 'next/server';
import type { PerformanceIssue } from '@/lib/performance/performance-monitor';

interface PerformanceIssueReport extends PerformanceIssue {
  url: string;
  userAgent: string;
  device: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const report: PerformanceIssueReport = await request.json();

    // Log issues in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [Performance Issue]', {
        type: report.type,
        severity: report.severity,
        message: report.message,
        url: report.url,
      });
    }

    // In production, you would:
    // 1. Store issues in database
    // 2. Send to error tracking service (Sentry, etc.)
    // 3. Trigger alerts for critical issues

    // Example: Send critical issues to Sentry
    if (report.severity === 'critical' && process.env.NODE_ENV === 'production') {
      // Sentry.captureMessage(report.message, {
      //   level: 'error',
      //   extra: report.details,
      // });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to process performance issue:', error);
    return NextResponse.json({ error: 'Failed to process issue' }, { status: 500 });
  }
}
