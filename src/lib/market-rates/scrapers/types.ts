/**
 * Price Scrapers - Universal Price Source System
 * ------------------------------------------------
 * این سیستم به ادمین اجازه می‌دهد منابع قیمت مختلف را مدیریت کند.
 * هر scraper یک URL، selector pattern، و conversion rules دارد.
 */

export type PriceSourceStatus = 'active' | 'inactive' | 'error';

export interface PriceSource {
  id: string;
  name: string; // مثلاً "TGJU.org", "Bonbast.com", "Sarafi.af"
  url: string;
  type: 'html' | 'json' | 'api';
  selector?: string; // برای HTML scraping
  jsonPath?: string; // برای JSON API
  headers?: Record<string, string>;
  enabled: boolean;
  priority: number; // اولویت وقتی چند منبع داریم
  lastFetchAt?: Date;
  lastFetchStatus?: PriceSourceStatus;
  fetchCount: number;
  errorCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScrapedRate {
  symbol: string;
  value: number;
  changePercent: number;
  buyValue?: number;
  sellValue?: number;
  timestamp: Date;
  sourceId: string;
}

export interface ScraperConfig {
  userAgent: string;
  timeout: number;
  retryCount: number;
  retryDelay: number;
}

export const DEFAULT_SCRAPER_CONFIG: ScraperConfig = {
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  timeout: 10000,
  retryCount: 3,
  retryDelay: 1000,
};
