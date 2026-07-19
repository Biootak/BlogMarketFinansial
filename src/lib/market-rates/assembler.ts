// src/lib/market-rates/assembler.ts
// تنها جایی که نرخ‌های بازار خوانده/محاسبه می‌شود (single source of truth).

import prisma from '@/lib/db';
import { crossRateToToman, fetchBonbastRates } from './bonbast';
import { getGlobalFxRates } from './fx';
import { SYMBOL_REGISTRY_MAP } from './registry';
import { fetchSarafiRates } from './sarafi';
import { fetchAllTgjuPages } from './tgju';
import { CANONICAL_KEY_TO_SOURCES, type SymbolSource } from './tgjuKeys';
import type { MarketRateGroup, MarketRateItem, MarketRateProvider, MarketRateUnit } from './types';
import { getUsdtRate } from './usdt';

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

  const [allPages, usdt, fx, bonbast, sarafi] = await Promise.all([
    fetchAllTgjuPages(),
    getUsdtRate(),
    getGlobalFxRates(),
    fetchBonbastRates(),
    fetchSarafiRates(),
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
    const item = assembleFromRow(row, tgjuMap, usdt, fx, bonbast, sarafi, registry);
    if (item) out.push(item);
  }
  return out;
}

function assembleFromRow(
  row: DbRow,
  tgjuMap: Map<string, TgjuRate>,
  usdt: Awaited<ReturnType<typeof getUsdtRate>>,
  fx: Awaited<ReturnType<typeof getGlobalFxRates>>,
  bonbast: Awaited<ReturnType<typeof fetchBonbastRates>>,
  sarafi: Awaited<ReturnType<typeof fetchSarafiRates>>,
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
        } else if (source.side === 'sell') {
          sellValue = t.value;
          if (changePercent === 0) changePercent = t.change;
        } else {
          rawValue = t.value;
          changePercent = t.change;
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

  // 2b. از registry/DB tgjuKey — مستقیم با همه prefix های صفحات امتحان می‌کنیم.
  // این fallback برای symbolهایی است که در CANONICAL_KEY_TO_SOURCES نیستند
  // ولی DB/registry برایشان tgjuKey تعریف کرده (مثل ارزهای جدید).
  // همچنین برای 'currency_price_afn' → در tgjuMap به همان شکل است.
  if (rawValue === null && tgjuKey) {
    // اول کلید خام را امتحان کن
    let found = tgjuMap.get(tgjuKey);
    if (!found) {
      // سپس با prefix هر صفحه امتحان کن (برای کلیدهای مثل 'sekee', 'ons', 'geram18')
      const pagePrefixes = [
        'coin_',
        'global_',
        'sana_',
        'transfer_',
        'currency_',
        'bank_',
        'minor_',
        'local_',
      ];
      for (const prefix of pagePrefixes) {
        if (!tgjuKey.startsWith(prefix)) {
          found = tgjuMap.get(prefix + tgjuKey);
          if (found) break;
        }
      }
    }
    if (found) {
      rawValue = found.value;
      changePercent = found.change;
    }
  }

  // Priority 3: sarafi.af — برای SARA_* symbols (سرای شاهزاده — نرخ AFN واقعی با buy/sell)
  if (rawValue === null && symbol.startsWith('SARA_') && sarafi) {
    const fxCode = symbol.replace('SARA_', '').toUpperCase();
    const entry = sarafi.rates[fxCode];
    if (entry) {
      // نرخ‌ها در AFN هستند — divisor=1 انتظار داریم
      buyValue = entry.buyRate * divisor;
      sellValue = entry.sellRate * divisor;
      rawValue = ((entry.buyRate + entry.sellRate) / 2) * divisor;
      changePercent = 0;
    }
  }

  // Priority 3b: bonbast.com — برای BONBAST_* و HERAT_* symbols
  if (rawValue === null && bonbast) {
    let fxCode: string | null = null;
    if (symbol.startsWith('BONBAST_')) {
      fxCode = symbol.replace('BONBAST_', '');
    } else if (symbol.startsWith('HERAT_')) {
      fxCode = symbol.replace('HERAT_', '');
    }
    if (fxCode) {
      const crossRate = bonbast.crossRates[fxCode.toUpperCase()];
      if (crossRate && crossRate > 0) {
        rawValue = crossRateToToman(crossRate, bonbast.irrPerEur) * divisor;
        changePercent = 0;
      }
    }
  }

  // Priority 4: USDT-derived برای IRAN_USD
  if (rawValue === null && symbol === 'IRAN_USD' && usdt) {
    const premium = getUsdtPremiumPercent();
    rawValue = usdt.toman * (1 + premium / 100) * 10;
    changePercent = usdt.change;
  }

  // Priority 5: FX-derived (از USDT × نرخ فارکس جهانی)
  // changePercent = usdt.change — بهترین تقریب موجود برای این ارزها
  if (rawValue === null && usdt && fx && symbol.startsWith('IRAN_')) {
    const fxCode = symbol.replace('IRAN_', '').slice(0, 3);
    const perUsd = fx[fxCode];
    if (perUsd && perUsd > 0) {
      rawValue = (usdt.toman / perUsd) * 10;
      changePercent = usdt.change;
    }
  }

  // Priority 6: bonbast fallback برای هر symbol که هنوز null است
  // (مثلاً BANK_AFN که TGJU داده‌ای ندارد)
  if (rawValue === null && bonbast) {
    // حذف prefix‌های شناخته‌شده برای پیدا کردن کد ارز
    const prefixes = ['BANK_', 'TRANSFER_', 'IRAN_', 'AFGHANI_', 'GLOBAL_', 'CURRENCY_', 'MINOR_', 'SARA_'];
    let fxCode: string | null = null;
    for (const p of prefixes) {
      if (symbol.startsWith(p)) {
        fxCode = symbol.slice(p.length);
        break;
      }
    }
    if (fxCode && fxCode.length >= 3) {
      const crossRate = bonbast.crossRates[fxCode.toUpperCase().slice(0, 3)];
      if (crossRate && crossRate > 0) {
        rawValue = crossRateToToman(crossRate, bonbast.irrPerEur) * divisor;
        changePercent = 0;
      }
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
  for (const [_canonicalKey, sources] of CANONICAL_KEY_TO_SOURCES) {
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
  const prefixes = [
    'transfer_',
    'currency_',
    'minor_',
    'bank_',
    'coin_',
    'bubble_',
    'sana_',
    'global_',
    'local_',
  ];
  for (const p of prefixes) {
    if (key.startsWith(p)) return key.slice(p.length);
  }
  return key;
}
