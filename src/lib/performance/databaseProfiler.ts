/**
 * Database Query Profiler
 * پروفایل کردن و بهینه‌سازی Prisma queries
 */

import type { PrismaMiddlewareParams, PrismaMiddlewareNext } from './types';

export interface QueryProfile {
  query: string;
  duration: number;
  timestamp: Date;
  stackTrace: string[];
  params?: unknown;
  model?: string;
  operation?: string;
}

export interface N1Pattern {
  location: string;
  queries: QueryProfile[];
  suggestion: string;
  potentialSaving: number;
}

export interface IndexSuggestion {
  table: string;
  columns: string[];
  reason: string;
  estimatedImpact: string;
}

export interface ConnectionMetric {
  activeConnections: number;
  waitingConnections: number;
  timeouts: number;
  avgWaitTime: number;
}

export interface QueryAnalysis {
  slowQueries: QueryProfile[];
  n1Problems: N1Pattern[];
  missingIndexes: IndexSuggestion[];
  connectionIssues: ConnectionMetric[];
  totalQueries: number;
  avgDuration: number;
}

export class DatabaseProfiler {
  private enabled = false;
  private queries: QueryProfile[] = [];
  private slowQueryThreshold = 100; // ms
  private connectionMetrics: ConnectionMetric = {
    activeConnections: 0,
    waitingConnections: 0,
    timeouts: 0,
    avgWaitTime: 0,
  };

  /**
   * فعال کردن profiling
   */
  enableProfiling(): void {
    this.enabled = true;
    this.queries = [];
    console.log('✅ Database profiling enabled');
  }

  /**
   * غیرفعال کردن profiling
   */
  disableProfiling(): void {
    this.enabled = false;
    console.log('❌ Database profiling disabled');
  }

  /**
   * ثبت یک query
   */
  logQuery(profile: QueryProfile): void {
    if (!this.enabled) return;

    this.queries.push(profile);

    // Log slow queries immediately
    if (profile.duration > this.slowQueryThreshold) {
      console.warn(`🐌 Slow query detected (${profile.duration}ms):`, profile.query);
    }
  }

  /**
   * دریافت کوئری‌های کند
   */
  getSlowQueries(threshold: number = this.slowQueryThreshold): QueryProfile[] {
    return this.queries
      .filter((q) => q.duration > threshold)
      .sort((a, b) => b.duration - a.duration);
  }

  /**
   * شناسایی الگوهای N+1
   */
  detectN1Patterns(): N1Pattern[] {
    const patterns: N1Pattern[] = [];
    const queryGroups = new Map<string, QueryProfile[]>();

    // Group similar queries
    for (const query of this.queries) {
      // Extract base query pattern (without specific IDs)
      const pattern = this.extractQueryPattern(query.query);
      if (!queryGroups.has(pattern)) {
        queryGroups.set(pattern, []);
      }
      queryGroups.get(pattern)?.push(query);
    }

    // Find N+1 patterns (same query executed multiple times in short time)
    for (const [_pattern, queries] of queryGroups.entries()) {
      if (queries.length > 5) {
        // More than 5 similar queries
        const timeSpan =
          queries[queries.length - 1].timestamp.getTime() - queries[0].timestamp.getTime();

        if (timeSpan < 1000) {
          // Within 1 second
          const totalDuration = queries.reduce((sum, q) => sum + q.duration, 0);

          patterns.push({
            location: queries[0].stackTrace[0] || 'unknown',
            queries: queries,
            suggestion: this.generateN1Suggestion(queries[0]),
            potentialSaving: totalDuration * 0.8, // Estimate 80% saving
          });
        }
      }
    }

    return patterns;
  }

  /**
   * پیشنهاد index های مفقود
   */
  suggestIndexes(): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];
    const slowQueries = this.getSlowQueries(50);

    for (const query of slowQueries) {
      // Parse query to find WHERE clauses
      const whereColumns = this.extractWhereColumns(query.query);

      if (whereColumns.length > 0 && query.model) {
        suggestions.push({
          table: query.model,
          columns: whereColumns,
          reason: `کوئری کند (${query.duration}ms) با WHERE clause`,
          estimatedImpact: this.estimateIndexImpact(query.duration),
        });
      }
    }

    // Remove duplicates
    return this.deduplicateIndexSuggestions(suggestions);
  }

  /**
   * تحلیل جامع کوئری‌ها
   */
  analyze(): QueryAnalysis {
    const slowQueries = this.getSlowQueries();
    const n1Problems = this.detectN1Patterns();
    const missingIndexes = this.suggestIndexes();

    const totalDuration = this.queries.reduce((sum, q) => sum + q.duration, 0);
    const avgDuration = this.queries.length > 0 ? totalDuration / this.queries.length : 0;

    return {
      slowQueries,
      n1Problems,
      missingIndexes,
      connectionIssues: [this.connectionMetrics],
      totalQueries: this.queries.length,
      avgDuration,
    };
  }

  /**
   * ایجاد Prisma middleware برای logging
   */
  createPrismaMiddleware() {
    return async (params: PrismaMiddlewareParams, next: PrismaMiddlewareNext) => {
      const start = Date.now();

      try {
        const result = await next(params);
        const duration = Date.now() - start;

        // Log query
        this.logQuery({
          query: `${params.model}.${params.action}`,
          duration,
          timestamp: new Date(),
          stackTrace: this.captureStackTrace(),
          params: params.args,
          model: params.model,
          operation: params.action,
        });

        return result;
      } catch (error) {
        const duration = Date.now() - start;

        // Log failed query
        this.logQuery({
          query: `${params.model}.${params.action} (FAILED)`,
          duration,
          timestamp: new Date(),
          stackTrace: this.captureStackTrace(),
          params: params.args,
          model: params.model,
          operation: params.action,
        });

        throw error;
      }
    };
  }

  /**
   * Extract query pattern for grouping
   */
  private extractQueryPattern(query: string): string {
    // Remove specific IDs and values to get pattern
    return query
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, 'ID')
      .replace(/\b\d+\b/g, 'NUM')
      .replace(/'[^']*'/g, 'STR');
  }

  /**
   * Generate N+1 suggestion
   */
  private generateN1Suggestion(query: QueryProfile): string {
    if (query.operation === 'findMany' || query.operation === 'findUnique') {
      return `استفاده از Prisma include یا select برای بارگذاری یکجای داده‌ها:

// بجای:
const items = await prisma.${query.model}.findMany();
for (const item of items) {
  const related = await prisma.related.findMany({ where: { itemId: item.id } });
}

// استفاده کنید از:
const items = await prisma.${query.model}.findMany({
  include: {
    related: true
  }
});`;
    }

    return 'استفاده از Prisma include برای بارگذاری یکجای داده‌های مرتبط';
  }

  /**
   * Extract WHERE columns from query
   */
  private extractWhereColumns(query: string): string[] {
    const columns: string[] = [];

    // Simple pattern matching for common WHERE patterns
    const whereMatch = query.match(/WHERE\s+(\w+)/gi);
    if (whereMatch) {
      for (const match of whereMatch) {
        const column = match.replace(/WHERE\s+/i, '');
        if (column && !columns.includes(column)) {
          columns.push(column);
        }
      }
    }

    return columns;
  }

  /**
   * Estimate index impact
   */
  private estimateIndexImpact(duration: number): string {
    if (duration > 500) return 'بسیار بالا (کاهش 70-90%)';
    if (duration > 200) return 'بالا (کاهش 50-70%)';
    if (duration > 100) return 'متوسط (کاهش 30-50%)';
    return 'پایین (کاهش 10-30%)';
  }

  /**
   * Deduplicate index suggestions
   */
  private deduplicateIndexSuggestions(suggestions: IndexSuggestion[]): IndexSuggestion[] {
    const unique = new Map<string, IndexSuggestion>();

    for (const suggestion of suggestions) {
      const key = `${suggestion.table}:${suggestion.columns.join(',')}`;
      if (!unique.has(key)) {
        unique.set(key, suggestion);
      }
    }

    return Array.from(unique.values());
  }

  /**
   * Capture stack trace
   */
  private captureStackTrace(): string[] {
    const stack = new Error().stack || '';
    return stack
      .split('\n')
      .slice(3) // Skip first 3 lines (Error, this function, caller)
      .map((line) => line.trim())
      .filter((line) => !line.includes('node_modules'))
      .slice(0, 5); // Keep top 5 relevant frames
  }

  /**
   * Update connection metrics
   */
  updateConnectionMetrics(metrics: Partial<ConnectionMetric>): void {
    this.connectionMetrics = {
      ...this.connectionMetrics,
      ...metrics,
    };
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      totalQueries: this.queries.length,
      slowQueries: this.getSlowQueries().length,
      avgDuration: this.queries.reduce((sum, q) => sum + q.duration, 0) / this.queries.length || 0,
      connectionMetrics: this.connectionMetrics,
    };
  }

  /**
   * Clear collected data
   */
  clear(): void {
    this.queries = [];
    console.log('🧹 Database profiler data cleared');
  }
}

// Singleton instance
export const databaseProfiler = new DatabaseProfiler();
