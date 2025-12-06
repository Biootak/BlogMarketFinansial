/**
 * Performance Library Type Definitions
 * تعاریف type برای کتابخانه performance
 */

import type { Prisma } from '@prisma/client';

/**
 * Webpack Stats Types
 */
export interface WebpackAsset {
  name: string;
  size: number;
  chunks?: string[];
  chunkNames?: string[];
}

export interface WebpackModule {
  name: string;
  size: number;
  chunks?: string[];
  id?: string | number;
}

export interface WebpackChunk {
  id: string | number;
  names?: string[];
  files?: string[];
  size?: number;
}

export interface WebpackStats {
  assets: WebpackAsset[];
  modules: WebpackModule[];
  chunks: WebpackChunk[];
  hash?: string;
  version?: string;
  time?: number;
}

/**
 * Database Analysis Types
 */
export interface DatabaseAnalysis {
  slowQueries: Array<{
    query: string;
    duration: number;
    stackTrace?: string[];
  }>;
  n1Problems: Array<{
    location: string;
    queries: unknown[];
    suggestion: string;
  }>;
  missingIndexes: Array<{
    table: string;
    columns: string[];
    reason: string;
  }>;
  totalQueries: number;
  avgDuration: number;
}

/**
 * SSR Analysis Types
 */
export interface SSRAnalysis {
  slowPages: Array<{
    route: string;
    renderTime: number;
    dataFetchTime?: number;
  }>;
  avgRenderTime: number;
  totalPages: number;
}

/**
 * Client Analysis Types
 */
export interface ClientAnalysis {
  lcp: number;
  fid: number;
  cls: number;
  inp: number;
  ttfb: number;
  lcpElement?: string;
  longTasks: Array<{
    name: string;
    duration: number;
  }>;
  layoutShifts: Array<{
    value: number;
    sources: unknown[];
  }>;
}

/**
 * Image Analysis Types
 */
export interface ImageAnalysis {
  totalImages: number;
  unoptimizedImages: Array<{
    path: string;
    size: number;
    format: string;
  }>;
  missingSizes: string[];
  missingPriority: string[];
}

/**
 * Memory Analysis Types
 */
export interface MemoryAnalysis {
  heapSize: number;
  usedHeap: number;
  heapLimit: number;
  potentialLeaks: Array<{
    component: string;
    type: string;
    description: string;
  }>;
}

/**
 * Cache Analysis Types
 */
export interface CacheAnalysis {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  avgResponseTime: number;
}

/**
 * Scripts Analysis Types
 */
export interface ScriptsAnalysis {
  totalScripts: number;
  blockingScripts: string[];
  largeScripts: Array<{
    path: string;
    size: number;
  }>;
}

/**
 * API Analysis Types
 */
export interface APIAnalysis {
  slowEndpoints: Array<{
    path: string;
    avgDuration: number;
    calls: number;
  }>;
  errorRate: number;
  totalRequests: number;
}

/**
 * Fonts Analysis Types
 */
export interface FontsAnalysis {
  totalFonts: number;
  unoptimizedFonts: string[];
  totalSize: number;
  recommendations: string[];
}

/**
 * Prisma Middleware Types
 */
export interface PrismaMiddlewareParams {
  model?: string;
  action: string;
  args: unknown;
  dataPath: string[];
  runInTransaction: boolean;
}

export type PrismaMiddlewareNext = (params: PrismaMiddlewareParams) => Promise<unknown>;

/**
 * Subscription Types for Memory Tracker
 */
export interface Subscription {
  unsubscribe: () => void;
}

/**
 * Web Vitals Metric Type
 */
export interface WebVitalsMetric {
  value: number;
  id: string;
  name: string;
  delta: number;
  entries: PerformanceEntry[];
}
