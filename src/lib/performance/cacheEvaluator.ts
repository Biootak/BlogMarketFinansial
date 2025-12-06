/**
 * Cache Evaluator
 * ارزیابی استراتژی caching
 */

export interface ResourceInfo {
  url: string;
  type: 'script' | 'style' | 'image' | 'font' | 'api' | 'other';
  cacheControl?: string;
  hasCache: boolean;
  recommendation: string;
}

export interface AccelerateMetrics {
  hitRate: number;
  missRate: number;
  uncachedQueries: string[];
  totalQueries: number;
  cachedQueries: number;
}

export interface RevalidationIssue {
  resource: string;
  frequency: number;
  lastRevalidation: Date;
  suggestion: string;
}

export interface CacheRecommendation {
  type: 'header' | 'strategy' | 'duration' | 'invalidation';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  example?: string;
}

export interface CacheAnalysis {
  missingHeaders: ResourceInfo[];
  accelerateMetrics?: AccelerateMetrics;
  revalidationIssues: RevalidationIssue[];
  recommendations: CacheRecommendation[];
  summary: {
    totalResources: number;
    cachedResources: number;
    cacheHitRate: number;
  };
}

export class CacheEvaluator {
  private resources: ResourceInfo[] = [];
  private revalidations = new Map<string, Date[]>();

  /**
   * تحلیل cache headers
   */
  analyzeCacheHeaders(): ResourceInfo[] {
    if (typeof window === 'undefined') {
      return [];
    }

    const resources: ResourceInfo[] = [];

    // Analyze performance entries
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    for (const entry of entries) {
      const resource = this.analyzeResource(entry);
      if (resource) {
        resources.push(resource);
      }
    }

    this.resources = resources;
    return resources.filter((r) => !r.hasCache);
  }

  /**
   * ارزیابی Prisma Accelerate
   */
  evaluatePrismaAccelerate(): AccelerateMetrics {
    // این نیاز به integration با Prisma Accelerate دارد
    // برای الان یک mock data برمی‌گردانیم

    return {
      hitRate: 0,
      missRate: 0,
      uncachedQueries: [],
      totalQueries: 0,
      cachedQueries: 0,
    };
  }

  /**
   * بررسی revalidation
   */
  checkRevalidation(): RevalidationIssue[] {
    const issues: RevalidationIssue[] = [];

    for (const [resource, dates] of this.revalidations.entries()) {
      if (dates.length > 10) {
        // More than 10 revalidations
        const frequency = dates.length;
        const lastRevalidation = dates[dates.length - 1];

        issues.push({
          resource,
          frequency,
          lastRevalidation,
          suggestion: 'افزایش مدت cache یا استفاده از stale-while-revalidate',
        });
      }
    }

    return issues;
  }

  /**
   * پیشنهاد بهبودها
   */
  suggestImprovements(): CacheRecommendation[] {
    const recommendations: CacheRecommendation[] = [];

    // Check for missing cache headers
    const missingHeaders = this.resources.filter((r) => !r.hasCache);

    if (missingHeaders.length > 0) {
      recommendations.push({
        type: 'header',
        severity: 'high',
        title: `${missingHeaders.length} منبع بدون cache header`,
        description: 'منابع استاتیک باید cache header مناسب داشته باشند',
        example: `
// در next.config.ts:
async headers() {
  return [
    {
      source: '/static/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ];
}`,
      });
    }

    // Check for API routes without cache
    const apiRoutes = this.resources.filter((r) => r.type === 'api' && !r.hasCache);

    if (apiRoutes.length > 0) {
      recommendations.push({
        type: 'strategy',
        severity: 'medium',
        title: `${apiRoutes.length} API route بدون cache`,
        description: 'API routeها باید cache strategy مناسب داشته باشند',
        example: `
// در API route:
export async function GET() {
  const data = await fetchData();
  
  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  });
}`,
      });
    }

    // Check for over-revalidation
    const revalidationIssues = this.checkRevalidation();

    if (revalidationIssues.length > 0) {
      recommendations.push({
        type: 'invalidation',
        severity: 'medium',
        title: `${revalidationIssues.length} منبع با revalidation زیاد`,
        description: 'برخی منابع بیش از حد revalidate می‌شوند',
        example: `
// استفاده از stale-while-revalidate:
Cache-Control: public, max-age=60, stale-while-revalidate=300`,
      });
    }

    return recommendations;
  }

  /**
   * تحلیل یک resource
   */
  private analyzeResource(entry: PerformanceResourceTiming): ResourceInfo | null {
    const url = entry.name;
    const type = this.getResourceType(url);

    // Skip data URLs and blob URLs
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return null;
    }

    // Check if resource was cached
    const hasCache = entry.transferSize === 0 && entry.decodedBodySize > 0;

    let recommendation = '';
    if (!hasCache) {
      if (type === 'script' || type === 'style') {
        recommendation = 'اضافه کردن Cache-Control: public, max-age=31536000, immutable';
      } else if (type === 'image') {
        recommendation = 'اضافه کردن Cache-Control: public, max-age=31536000';
      } else if (type === 'api') {
        recommendation = 'اضافه کردن Cache-Control با s-maxage و stale-while-revalidate';
      }
    }

    return {
      url,
      type,
      hasCache,
      recommendation,
    };
  }

  /**
   * تشخیص نوع resource
   */
  private getResourceType(url: string): ResourceInfo['type'] {
    if (url.includes('/api/')) return 'api';
    if (url.endsWith('.js') || url.endsWith('.mjs')) return 'script';
    if (url.endsWith('.css')) return 'style';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf)$/i)) return 'font';
    return 'other';
  }

  /**
   * ثبت revalidation
   */
  recordRevalidation(resource: string): void {
    if (!this.revalidations.has(resource)) {
      this.revalidations.set(resource, []);
    }
    this.revalidations.get(resource)!.push(new Date());
  }

  /**
   * تحلیل جامع
   */
  analyze(): CacheAnalysis {
    const missingHeaders = this.analyzeCacheHeaders();
    const revalidationIssues = this.checkRevalidation();
    const recommendations = this.suggestImprovements();

    const totalResources = this.resources.length;
    const cachedResources = this.resources.filter((r) => r.hasCache).length;
    const cacheHitRate = totalResources > 0 ? (cachedResources / totalResources) * 100 : 0;

    return {
      missingHeaders,
      revalidationIssues,
      recommendations,
      summary: {
        totalResources,
        cachedResources,
        cacheHitRate,
      },
    };
  }

  /**
   * تولید گزارش
   */
  generateReport(analysis: CacheAnalysis): string {
    const { summary, missingHeaders, revalidationIssues, recommendations } = analysis;

    let report = `# گزارش تحلیل Cache\n\n`;
    report += `## خلاصه\n`;
    report += `- کل منابع: ${summary.totalResources}\n`;
    report += `- منابع cached: ${summary.cachedResources}\n`;
    report += `- نرخ cache hit: ${summary.cacheHitRate.toFixed(1)}%\n\n`;

    if (missingHeaders.length > 0) {
      report += `## منابع بدون Cache Header (${missingHeaders.length})\n`;
      for (const resource of missingHeaders.slice(0, 10)) {
        report += `- **${resource.type}**: ${resource.url}\n`;
        report += `  پیشنهاد: ${resource.recommendation}\n`;
      }
      report += `\n`;
    }

    if (revalidationIssues.length > 0) {
      report += `## مشکلات Revalidation (${revalidationIssues.length})\n`;
      for (const issue of revalidationIssues) {
        report += `- ${issue.resource}: ${issue.frequency} بار revalidate شده\n`;
        report += `  پیشنهاد: ${issue.suggestion}\n`;
      }
      report += `\n`;
    }

    if (recommendations.length > 0) {
      report += `## پیشنهادات\n`;
      for (const rec of recommendations) {
        report += `### ${rec.title} (${rec.severity})\n`;
        report += `${rec.description}\n`;
        if (rec.example) {
          report += `\`\`\`typescript\n${rec.example}\n\`\`\`\n`;
        }
        report += `\n`;
      }
    }

    return report;
  }

  /**
   * پاک کردن داده‌ها
   */
  clear(): void {
    this.resources = [];
    this.revalidations.clear();
  }
}

// Singleton instance
export const cacheEvaluator = new CacheEvaluator();
