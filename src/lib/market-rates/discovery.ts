// src/lib/market-rates/discovery.ts
// لیست همه‌ی symbol های موجود در TGJU homepage.

import { safeCache } from '@/lib/safe-cache';
import { fetchTgjuLatest } from './tgju';

export interface TgjuSymbol {
  tgjuKey: string;
  displayNameFa: string;
  lastValue: number;
  lastChange: number;
}

/** لیست نمادهای TGJU با کش ۱ ساعته (TGJU خودش CDN cache 5min دارد). */
export const discoverTgjuSymbols = safeCache(
  async (): Promise<TgjuSymbol[]> => {
    const result = await fetchTgjuLatest();
    if (!result.ok || !result.data) return [];

    const list: TgjuSymbol[] = [];
    for (const [key, v] of Object.entries(result.data)) {
      list.push({
        tgjuKey: key,
        displayNameFa: key,
        lastValue: v.value,
        lastChange: v.change,
      });
    }
    return list;
  },
  [] as TgjuSymbol[],
  {
    key: 'market-rates:tgju-symbols',
    ttl: 3600,
    tags: ['market-rates:ticker'],
  },
);
