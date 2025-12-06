/**
 * API Route Profiler
 * پروفایل کردن API routes
 */

export interface APICallLog {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  payloadSize: number;
  timestamp: Date;
}

export interface APIAnalysis {
  slowEndpoints: APICallLog[];
  largePayloads: APICallLog[];
  errorRate: number;
  avgResponseTime: number;
  recommendations: APIRecommendation[];
}

export interface APIRecommendation {
  endpoint: string;
  issue: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

export class APIProfiler {
  private calls: APICallLog[] = [];
  private slowThreshold = 200; // ms

  /**
   * ثبت یک API call
   */
  logCall(log: APICallLog): void {
    this.calls.push(log);

    if (log.responseTime > this.slowThreshold) {
      console.warn(`🐌 Slow API call: ${log.endpoint} (${log.responseTime}ms)`);
    }
  }

  /**
   * دریافت endpointهای کند
   */
  getSlowEndpoints(threshold: number = this.slowThreshold): APICallLog[] {
    return this.calls
      .filter((c) => c.responseTime > threshold)
      .sort((a, b) => b.responseTime - a.responseTime);
  }

  /**
   * شناسایی payloadهای بزرگ
   */
  identifyLargePayloads(threshold: number = 1024 * 1024): APICallLog[] {
    return this.calls
      .filter((c) => c.payloadSize > threshold)
      .sort((a, b) => b.payloadSize - a.payloadSize);
  }

  /**
   * تحلیل جامع
   */
  analyze(): APIAnalysis {
    const slowEndpoints = this.getSlowEndpoints();
    const largePayloads = this.identifyLargePayloads();

    const errorCalls = this.calls.filter((c) => c.statusCode >= 400);
    const errorRate = this.calls.length > 0 ? (errorCalls.length / this.calls.length) * 100 : 0;

    const totalTime = this.calls.reduce((sum, c) => sum + c.responseTime, 0);
    const avgResponseTime = this.calls.length > 0 ? totalTime / this.calls.length : 0;

    const recommendations = this.generateRecommendations(slowEndpoints, largePayloads);

    return {
      slowEndpoints,
      largePayloads,
      errorRate,
      avgResponseTime,
      recommendations,
    };
  }

  /**
   * تولید پیشنهادات
   */
  private generateRecommendations(
    slowEndpoints: APICallLog[],
    largePayloads: APICallLog[],
  ): APIRecommendation[] {
    const recommendations: APIRecommendation[] = [];

    for (const endpoint of slowEndpoints.slice(0, 5)) {
      recommendations.push({
        endpoint: endpoint.endpoint,
        issue: `زمان پاسخ بالا (${endpoint.responseTime}ms)`,
        suggestion: 'بهینه‌سازی کوئری‌های دیتابیس یا اضافه کردن caching',
        priority: endpoint.responseTime > 1000 ? 'high' : 'medium',
      });
    }

    for (const payload of largePayloads.slice(0, 5)) {
      recommendations.push({
        endpoint: payload.endpoint,
        issue: `حجم payload بزرگ (${this.formatBytes(payload.payloadSize)})`,
        suggestion: 'استفاده از pagination یا field selection',
        priority: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * تولید گزارش
   */
  generateReport(analysis: APIAnalysis): string {
    const { slowEndpoints, largePayloads, errorRate, avgResponseTime, recommendations } = analysis;

    let report = '# گزارش تحلیل API Performance\n\n';
    report += '## خلاصه\n';
    report += `- کل درخواست‌ها: ${this.calls.length}\n`;
    report += `- میانگین زمان پاسخ: ${avgResponseTime.toFixed(0)}ms\n`;
    report += `- نرخ خطا: ${errorRate.toFixed(1)}%\n`;
    report += `- Endpointهای کند: ${slowEndpoints.length}\n\n`;

    if (slowEndpoints.length > 0) {
      report += '## Endpointهای کند\n';
      for (const endpoint of slowEndpoints.slice(0, 10)) {
        report += `- ${endpoint.method} ${endpoint.endpoint}: ${endpoint.responseTime.toFixed(0)}ms\n`;
      }
      report += '\n';
    }

    if (largePayloads.length > 0) {
      report += '## Payloadهای بزرگ\n';
      for (const payload of largePayloads.slice(0, 10)) {
        report += `- ${payload.endpoint}: ${this.formatBytes(payload.payloadSize)}\n`;
      }
      report += '\n';
    }

    if (recommendations.length > 0) {
      report += '## پیشنهادات\n';
      for (const rec of recommendations) {
        report += `### ${rec.endpoint} (${rec.priority})\n`;
        report += `- مشکل: ${rec.issue}\n`;
        report += `- پیشنهاد: ${rec.suggestion}\n\n`;
      }
    }

    return report;
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  clear(): void {
    this.calls = [];
  }
}

export const apiProfiler = new APIProfiler();
