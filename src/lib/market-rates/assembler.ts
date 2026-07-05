// src/lib/market-rates/assembler.ts
// تنها جایی که نرخ‌های بازار خوانده/محاسبه می‌شود (single source of truth).

import prisma from '@/lib/db';
import type {
  MarketRateItem,
  MarketRateGroup,
  MarketRateUnit,
  MarketRateProvider,
} from './types';
import { SYMBOL_REGISTRY_MAP } from './registry';
import { fetchAllTgjuPages } from './tgju';
import { CANONICAL_KEY_TO_SOURCES, CANONICAL_KEY_TO_SOURCE, type SymbolSource } from './tgjuKeys';
import { getUsdtRate } from './usdt';
import { getGlobalFxRates } from './fx';

function getUsdtPremiumPercent(): number {
  const raw = process.env.USDT_PREMIUM_PERCENT;
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 50) return 0;
  return n;
}

type DbRow = Awaited<ReturnType<typeof prisma.exchangeRate.findFirstOrThrow>>;
type RegistryEntry = import('./types').SymbolRegistryEntry;

interface TgjuRate {
  value: number;
  change: number;
  pageId: string;
}

/**
 * assembleMarketRates — single source of truth.
 *
 * برای هر ExchangeRate فعال (active=true):
 *   1. provider='manual' → از singleRate
 *   2. provider='auto' + SymbolSource mapping → از TGJU (multi-page)
 *   3. provider='auto' + symbol='IRAN_USD' + USDT موجود → از USDT × premium
 *   4. provider='auto' + USDT/FX موجود → از FX-derived
 *   5. هیچ‌کدام → null (در ticker نمایش داده نمی‌شود)
 *
 * خروجی: آرایه‌ی مرتب‌شده بر اساس priority.
 */
export async function assembleMarketRates(): Promise<MarketRateItem[]> {
  const dbRows = await prisma.exchangeRate.findMany({
    where: { active: true },
    orderBy: { priority: 'asc' },
  });

  const [allPages, usdt, fx] = await Promise.all([
    fetchAllTgjuPages(),
    getUsdtRate(),
    getGlobalFxRates(),
  ]);

  // ساخت tgjuMap: کلید lookup = `pageId:tgjuKey` (مثلاً 'homepage:price_dollar_rl')
  // یا canonical key (مثلاً 'bubble_emami') اگه از coin page با override اومده باشه.
  const tgjuMap = new Map<string, TgjuRate>();
  for (const [pageId, result] of Object.entries(allPages)) {
    if (!result.ok || !result.data) continue;
    for (const [canonicalKey, item] of Object.entries(result.data)) {
      tgjuMap.set(canonicalKey, {
        value: item.value,
        change: item.change,
        pageId,
      });
    }
  }

  const out: MarketRateItem[] = [];
  for (const row of dbRows) {
    const symbol = row.symbol ?? row.currency;
    const registry = SYMBOL_REGISTRY_MAP.get(symbol);
    const item = assembleFromRow(row, tgjuMap, usdt, fx, registry);
    if (item) out.push(item);
  }
  return out;
}

function assembleFromRow(
  row: DbRow,
  tgjuMap: Map<string, TgjuRate>,
  usdt: Awaited<ReturnType<typeof getUsdtRate>>,
  fx: Awaited<ReturnType<typeof getGlobalFxRates>>,
  registry?: RegistryEntry,
): MarketRateItem | null {
  const symbol = row.symbol ?? row.currency;
  const displayNameFa = row.displayNameFa ?? row.name ?? symbol;
  const group = (row.group ?? registry?.group ?? 'iran-forex') as MarketRateGroup;
  const unit = (row.unit ?? registry?.unit ?? 'toman') as MarketRateUnit;
  const divisor = row.divisor ?? registry?.divisor ?? 10;
  const decimals = row.decimals ?? registry?.decimals ?? 0;
  const priority = row.priority ?? registry?.priority ?? 50;
  const provider = (row.provider ?? 'auto') as MarketRateProvider;
  const tgjuKey = row.tgjuKey ?? registry?.tgjuKey;

  let rawValue: number | null = null;
  let changePercent = 0;
  let sourcePage: string | null = null;

  // Priority 1: manual
  if (provider === 'manual' && row.singleRate) {
    const v = Number.parseFloat(row.singleRate);
    if (Number.isFinite(v) && v > 0) rawValue = v * divisor;
  }

  // Priority 2: TGJU — اول از tgjuKeys.ts (canonicalKey → pageId+tgjuKey)
  // اگه برای این symbol یک SymbolSource داشته باشیم، مستقیم از page مورد نظر scrape می‌کنیم.
  // اگه نه، از tgjuKey خام registry استفاده می‌کنیم (homepage default).
  if (rawValue === null) {
    // 2a. از tgjuKeys — اگه SymbolSource ثبت شده باشه (مثلاً TRANSFER_USD, BANK_USD, …)
    const sourceMatch = findSourceForSymbol(symbol);
    if (sourceMatch) {
      const { source, canonicalKey } = sourceMatch;
      // canonicalKey مثل 'transfer_usd' (در page transfer → 'transfer_transfer_usd' بعد از prefix)
      // اما در tgjuMap ما key canonical را با همان فرمتی که parser تولید کرده ذخیره کردیم.
      // برای یافتن key صحیح، دو candidate را امتحان می‌کنیم:
      //   1. canonicalKey (برای homepage keys که prefix ندارن)
      //   2. `${pagePrefix}${tgjuKey}` (برای صفحات دیگر که prefix دارن)
      const pagePrefix = getPagePrefix(source.pageId);
      const strippedKey = stripKnownPrefix(source.tgjuKey);
      const candidates: string[] = [
        strippedKey,                              // 'price_dollar_rl'
        source.tgjuKey,                           // 'transfer_usd'
        pagePrefix + source.tgjuKey,              // 'transfer_transfer_usd'
        pagePrefix + strippedKey,                 // 'transfer_price_dollar_rl' (rare)
      ];
      for (const key of candidates) {
        const t = tgjuMap.get(key);
        if (t) {
          rawValue = t.value;
          changePercent = t.change;
          sourcePage = t.pageId;
          break;
        }
      }
      // اگه باز هم پیدا نشد، log silent
      if (rawValue === null && canonicalKey) {
        // آخرین تلاش: canonicalKey از symbol source
        const t = tgjuMap.get(canonicalKey);
        if (t) {
          rawValue = t.value;
          changePercent = t.change;
          sourcePage = t.pageId;
        }
      }
    }
  }

  // 2b. از registry tgjuKey مستقیم (homepage default)
  if (rawValue === null && tgjuKey && tgjuMap.has(tgjuKey)) {
    const t = tgjuMap.get(tgjuKey)!;
    rawValue = t.value;
    changePercent = t.change;
    sourcePage = t.pageId;
  }

  // Priority 3: USDT-derived برای IRAN_USD
  if (rawValue === null && symbol === 'IRAN_USD' && usdt) {
    const premium = getUsdtPremiumPercent();
    rawValue = usdt.toman * (1 + premium / 100) * 10;
    changePercent = usdt.change;
  }

  // Priority 4: FX-derived
  if (rawValue === null && usdt && fx && symbol.startsWith('IRAN_')) {
    const fxCode = symbol.replace('IRAN_', '').slice(0, 3);
    const perUsd = fx[fxCode];
    if (perUsd && perUsd > 0) {
      rawValue = (usdt.toman / perUsd) * 10;
    }
  }

  if (rawValue === null || !Number.isFinite(rawValue) || rawValue <= 0) {
    return null;
  }

  const value = rawValue / divisor;

  return {
    symbol,
    displayNameFa,
    group,
    unit,
    divisor,
    decimals,
    priority,
    value,
    changePercent,
    provider,
    updatedAt: row.updatedAt,
  };
}

/* --------------------------------------------------------------------------
 *  Lookup helpers
 * ------------------------------------------------------------------------*/

/**
 * پیدا کردن SymbolSource برای یک symbol.
 * مثلاً symbol='IRAN_USD' → source: tgjuKey='price_dollar_rl', pageId='homepage'
 * symbol='TRANSFER_USD' → source: tgjuKey='transfer_usd', pageId='transfer'
 *
 * استراتژی:
 *   1. symbol === source.symbol → match مستقیم
 *   2. symbol === source.canonicalKey → match
 *   3. اگه symbol مثل 'BANK_USD' باشه و source.canonicalKey هم 'BANK_USD' باشه → match
 */
function findSourceForSymbol(symbol: string): { source: SymbolSource; canonicalKey: string } | null {
  // مستقیم — اکثر مواقع همین کافیه
  for (const [canonicalKey, source] of CANONICAL_KEY_TO_SOURCE) {
    if (source.symbol === symbol || source.canonicalKey === symbol) {
      return { source, canonicalKey };
    }
  }
  // تلاش دوم: prefix match — مثلاً symbol='BANK_USD' ممکنه با canonicalKey='BANK_USD' (که در source هست) match کنه
  // اما symbol === source.symbol هم باید چک بشه
  for (const [canonicalKey, source] of CANONICAL_KEY_TO_SOURCE) {
    if (source.canonicalKey === symbol) {
      return { source, canonicalKey };
    }
  }
  return null;
}

const PAGE_PREFIX: Record<string, string> = {
  homepage: '',
  transfer: 'transfer_',
  currency: 'currency_',
  'currency-minor': 'minor_',
  bank: 'bank_',
  coin: 'coin_',
  sana: 'sana_',
  'gold-global': 'global_',
  'local-markets': 'local_',
};

function getPagePrefix(pageId: string): string {
  return PAGE_PREFIX[pageId] ?? '';
}

/** حذف prefix های شناخته‌شده از ابتدای tgjuKey. */
function stripKnownPrefix(key: string): string {
  const prefixes = ['transfer_', 'currency_', 'minor_', 'bank_', 'coin_', 'bubble_', 'sana_', 'global_', 'local_'];
  for (const p of prefixes) {
    if (key.startsWith(p)) return key.slice(p.length);
  }
  return key;
}