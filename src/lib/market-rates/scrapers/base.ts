/**
 * Base Scraper - Generic scraping functionality
 * ---------------------------------------------
 * این کلاس پایه برای همه scrapers است و functionality مشترک را فراهم می‌کند.
 */

import { DEFAULT_SCRAPER_CONFIG, type ScrapedRate, type ScraperConfig } from './types';

export abstract class BaseScraper {
  protected config: ScraperConfig;

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = { ...DEFAULT_SCRAPER_CONFIG, ...config };
  }

  /**
   * Fetch یک URL با retry logic
   */
  protected async fetchWithRetry(url: string, headers?: Record<string, string>): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryCount; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.config.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
            ...headers,
          },
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.config.retryCount) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    throw new Error(`Failed after ${this.config.retryCount} attempts: ${lastError?.message}`);
  }

  /**
   * Fetch JSON API با retry logic
   */
  protected async fetchJsonWithRetry<T>(url: string, headers?: Record<string, string>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryCount; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.config.userAgent,
            'Accept': 'application/json',
            ...headers,
          },
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.config.retryCount) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    throw new Error(`Failed after ${this.config.retryCount} attempts: ${lastError?.message}`);
  }

  /**
   * Extract number from formatted string (مثلاً "1,234,567" → 1234567)
   */
  protected parseNumber(value: string): number {
    // Remove commas and other formatting
    const cleaned = value.replace(/[,\s]/g, '');
    const num = Number.parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

  /**
   * Extract percentage from string (مثلاً "(0.69%)" → 0.69)
   */
  protected parsePercent(value: string): number {
    const match = value.match(/(-?\d+\.?\d*)%/);
    if (match) {
      return Number.parseFloat(match[1]);
    }
    return 0;
  }

  /**
   * Delay helper for retry logic
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Abstract method - هر scraper باید این را implement کند
   */
  abstract scrape(): Promise<ScrapedRate[]>;
}
