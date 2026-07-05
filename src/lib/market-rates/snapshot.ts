// src/lib/market-rates/snapshot.ts
// نوشتن snapshot بازار به یک فایل JSON برای استفاده‌ی استاتیک (CDN-friendly).

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { assembleMarketRates } from './assembler';

export interface SnapshotResult {
  /** تعداد نرخ‌های ذخیره‌شده. */
  count: number;
  /** مسیر فایل خروجی (absolute). */
  path: string;
  /** timestamp. */
  generatedAt: string;
}

/**
 * تولید snapshot از assembled market rates و نوشتن در فایل JSON.
 *
 * @param outDir پوشه‌ی خروجی (پیش‌فرض: `public/data` — برای static serving).
 * @param fileName نام فایل (پیش‌فرض: `market-rates.json`).
 */
export async function writeMarketRatesSnapshot(
  outDir = join(process.cwd(), 'public', 'data'),
  fileName = 'market-rates.json',
): Promise<SnapshotResult> {
  const items = await assembleMarketRates();

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