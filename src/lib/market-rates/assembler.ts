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
import { CANONICAL_KEY_TO_SOURCES, type SymbolSource } from './tgjuKeys';
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
  // Two-sided rates (e.g. SANA / national bank) carry a buy and a sell value.
  let buyValue: number | null = null;
  let sellValue: number | null = null;

  // Priority 1: manual
  if (provider === 'manual' && row.singleRate) {
    const v = Number.parseFloat(row.singleRate);
    if (Number.isFinite(v) && v > 0) rawValue = v * divisor;
  }

  // Priority 2: TGJU — از tgjuKeys.ts (canonicalKey → pageId+tgjuKey).
  // یک symbol ممکن است چندین SymbolSource داشته باشد (مثل SANA/صرافی ملی:
  // خرید و فروش جداگانه). پس حتماً از CANONICAL_KEY_TO_SOURCES (آرایه‌ای)
  // استفاده می‌کنیم تا هر دو سمت پر شود — نه CANONICAL_KEY_TO_SOURCE که فقط
  // اولی را برمی‌گرداند و سمت دوم را حذف می‌کرد.
  if (rawValue === null) {
    const sources = findSourcesForSymbol(symbol);
    for (const source of sources) {
      const pagePrefix = getPagePrefix(source.pageId);
      const strippedKey = stripKnownPrefix(source.tgjuKey);
      const candidates: string[] = [
        strippedKey,
        source.tgjuKey,
        pagePrefix + source.tgjuKey,
        pagePrefix + strippedKey,
      ];
      for (const key of candidates) {
        const t = tgjuMap.get(key);
        if (!t) continue;
        if (source.side === 'buy') {
          buyValue = t.value;
          if (changePercent === 0) changePercent = t.change;
          sourcePage = t.pageId;
        } else if (source.side === 'sell') {
          sellValue = t.value;
          if (changePercent === 0) changePercent = t.change;
          sourcePage = t.pageId;
        } else {
          rawValue = t.value;
          changePercent = t.change;
          sourcePage = t.pageId;
        }
        break;
      }
    }

    // نرخ دوطرفه: مقدار نمایشی = میانگین خرید و فروش
    if (buyValue !== null && sellValue !== null) {
      rawValue = (buyValue + sellValue) / 2;
    } else if (buyValue !== null) {
      rawValue = buyValue;
    } else if (sellValue !== null) {
      rawValue = sellValue;
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
    buyValue: buyValue ?? undefined,
    sellValue: sellValue ?? undefined,
    spread: buyValue !== null && sellValue !== null ? sellValue - buyValue : undefined,
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
function findSourcesForSymbol(symbol: string): SymbolSource[] {
  const out: SymbolSource[] = [];
  for (const [canonicalKey, sources] of CANONICAL_KEY_TO_SOURCES) {
    // هم symbol مستقیم و هم canonicalKey یکسان را چک می‌کنیم تا هر دو سمت
    // (buy/sell) برای نرخ‌های دوطرفه پیدا شود.
    if (sources.some((s) => s.symbol === symbol || s.canonicalKey === symbol)) {
      out.push(...sources);
    }
  }
  return out;
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