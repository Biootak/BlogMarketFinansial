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
import { fetchTgjuLatest } from './tgju';
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

/**
 * assembleMarketRates — single source of truth.
 *
 * برای هر ExchangeRate فعال (active=true):
 *   1. provider='manual' → از singleRate
 *   2. provider='auto' + tgjuKey → از TGJU
 *   3. provider='auto' + symbol='IRAN_USD' + USDT موجود → از USDT × premium
 *   4. provider='auto' + USDT/FX موجود → از FX-derived
 *   5. هیچ‌کدام → null (در ticker نمایش داده نمی‌شود)
 *
 * خروجی: آرایه‌ی مرتب‌شده بر اساس priority.
 */
export async function assembleMarketRates(): Promise<MarketRateItem[]> {
  // 2026-06-20: dual-mode — schema جدید (symbol/active/priority) ممکن است
  // در production هنوز migration نشده باشد. ابتدا با select کامل امتحان
  // می‌کنیم؛ اگر Prisma خطا داد (ستون ناشناس)، به legacy mode برمی‌گردیم.
  let dbRows: DbRow[];
  try {
    dbRows = await prisma.exchangeRate.findMany({
      where: { active: true },
      orderBy: { priority: 'asc' },
    });
  } catch {
    // fallback: select قدیمی (currency, name, singleRate)
    const legacyRows = await prisma.exchangeRate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    dbRows = legacyRows.map((r) => ({
      ...r,
      symbol: null,
      displayNameFa: null,
      group: null,
      unit: null,
      divisor: 1,
      decimals: 0,
      priority: 50,
      provider: 'manual',
      tgjuKey: null,
      active: true,
    })) as unknown as DbRow[];
  }

  const [tgjuResult, usdt, fx] = await Promise.all([
    fetchTgjuLatest(),
    getUsdtRate(),
    getGlobalFxRates(),
  ]);

  const tgjuMap = new Map<string, { value: number; change: number }>();
  if (tgjuResult.ok && tgjuResult.data) {
    for (const [k, v] of Object.entries(tgjuResult.data)) {
      tgjuMap.set(k, { value: v.value, change: v.change });
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
  tgjuMap: Map<string, { value: number; change: number }>,
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

  // Priority 1: manual
  if (provider === 'manual' && row.singleRate) {
    const v = Number.parseFloat(row.singleRate);
    if (Number.isFinite(v) && v > 0) rawValue = v * divisor;
  }

  // Priority 2: TGJU
  if (rawValue === null && tgjuKey && tgjuMap.has(tgjuKey)) {
    const t = tgjuMap.get(tgjuKey)!;
    rawValue = t.value;
    changePercent = t.change;
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
