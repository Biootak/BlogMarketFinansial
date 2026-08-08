// src/lib/market-rates/snapshot.ts
// نوشتن snapshot بازار به یک فایل JSON برای استفاده‌ی استاتیک (CDN-friendly).

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { MarketRateItem } from './types';
import { assembleMarketRates } from './assembler';

export interface SnapshotResult {
  /** تعداد نرخ‌های ذخیره‌شده. */
  count: number;
  /** مسیر فایل خروجی (absolute). */
  path: string;
  /** timestamp. */
  generatedAt: string;
}

interface WriteSnapshotOptions {
  /** پوشه‌ی خروجی (پیش‌فرض: `public/data` — برای static serving). */
  outDir?: string;
  /** نام فایل (پیش‌فرض: `market-rates.json`). */
  fileName?: string;
  /**
   * 2026-08-08: نرخ‌های از قبل assembled — جلوگیری از assemble دوباره.
   * قبلاً cron خودش assemble می‌کرد و این تابع دوباره scrape می‌زد (۲× هزینه).
   */
  items?: MarketRateItem[];
}

/**
 * تولید snapshot از assembled market rates و نوشتن در فایل JSON.
 *
 * @param options پوشه/نام/آیتم‌های از قبل assembled.
 */
export async function writeMarketRatesSnapshot(
  options: WriteSnapshotOptions = {},
): Promise<SnapshotResult> {
  const outDir = options.outDir ?? join(process.cwd(), 'public', 'data');
  const fileName = options.fileName ?? 'market-rates.json';
  const items = options.items ?? (await assembleMarketRates());

  const data = items.map((r) => ({
    symbol: r.symbol,
    displayNameFa: r.displayNameFa,
    group: r.group,
    unit: r.unit,
    divisor: r.divisor,
    decimals: r.decimals,
    priority: r.priority,
    value: r.value,
    buyValue: r.buyValue,
    sellValue: r.sellValue,
    spread: r.spread,
    changePercent: r.changePercent,
    provider: r.provider,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
  }));

  const payload = {
    success: true,
    data,
    meta: {
      count: data.length,
      generatedAt: new Date().toISOString(),
      source: 'tgju+usdt+fx+manual',
    },
  };

  await mkdir(outDir, { recursive: true });
  const path = join(outDir, fileName);
  await writeFile(path, JSON.stringify(payload, null, 2), 'utf8');

  return {
    count: data.length,
    path,
    generatedAt: payload.meta.generatedAt,
  };
}
