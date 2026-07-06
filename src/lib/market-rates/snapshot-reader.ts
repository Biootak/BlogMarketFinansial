// src/lib/market-rates/snapshot-reader.ts
// ----------------------------------------------------------------------------
// خواندن snapshot بازار از `public/data/market-rates.json` برای استفاده‌ی
// SSR (offline-friendly). اگه فایل نباشه یا خراب باشه، null برمی‌گرده.
//
// چرا این helper:
//   - صفحه‌ی money-transfer نیاز به نرخ‌های زنده دارد. در dev ممکنه TGJU/USDT
//     scrape fail شود. در prod، snapshot توسط cron تولید می‌شود و به‌عنوان
//     fallback قابل‌اعتماد در دسترس است.
//   - freshness در hero از `snapshot.generatedAt` حساب می‌شود تا کاربر
//     بفهمد آخرین به‌روزرسانی مربوط به چه زمانی است.
// ----------------------------------------------------------------------------

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface SnapshotItem {
  symbol: string;
  displayNameFa: string;
  group: string;
  unit: string;
  divisor: number;
  decimals: number;
  priority: number;
  /** مقدار اصلی (برای نرخ‌های تک‌قیمتی مثل دلار بازار آزاد). */
  value: number;
  /** نرخ خرید صرافی ملی (اختیاری). */
  buyValue?: number;
  /** نرخ فروش صرافی ملی (اختیاری). */
  sellValue?: number;
  changePercent: number;
  provider: 'auto' | 'manual';
  updatedAt: string;
}

export interface SnapshotPayload {
  items: SnapshotItem[];
  generatedAt: Date | null;
  count: number;
}

/**
 * خواندن snapshot از disk. اگه فایل نباشه یا JSON خراب باشه، null برمی‌گرده.
 * هیچ‌گاه throw نمی‌کند — این یک safe reader است.
 */
export async function readMarketRatesSnapshot(): Promise<SnapshotPayload | null> {
  try {
    const path = join(process.cwd(), 'public', 'data', 'market-rates.json');
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as {
      data?: SnapshotItem[];
      meta?: { generatedAt?: string; count?: number };
    };
    if (!parsed.data || !Array.isArray(parsed.data) || parsed.data.length === 0) {
      return null;
    }
    return {
      items: parsed.data,
      generatedAt: parsed.meta?.generatedAt ? new Date(parsed.meta.generatedAt) : null,
      count: parsed.data.length,
    };
  } catch {
    return null;
  }
}
