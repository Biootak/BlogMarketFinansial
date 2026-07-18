// src/lib/market-rates/discovery.ts
// لیست همه‌ی symbol های موجود در TGJU homepage.

import { unstable_cache } from 'next/cache';
import { fetchTgjuLatest } from './tgju';

export interface TgjuSymbol {
  tgjuKey: string;
  displayNameFa: string;
  lastValue: number;
  lastChange: number;
}

/** لیست نمادهای TGJU با کش ۱ ساعته (TGJU خودش CDN cache 5min دارد). */
export const discoverTgjuSymbols = unstable_cache(
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
  ['market-rates:tgju-symbols:v1'],
  { revalidate: 3600 },
);
