import { assembleMarketRates } from '@/lib/market-rates';
import { safeCache } from '@/lib/safe-cache';
import { NextResponse } from 'next/server';

interface SymbolItem { symbol: string; displayNameFa: string; marketRateToman: number; changePercent: number; }
const FALLBACK: { items: SymbolItem[]; updatedAt: string } = { items: [], updatedAt: new Date(0).toISOString() };
const EXCLUDED_GROUPS = new Set(['global']);
async function buildSymbols(): Promise<{ items: SymbolItem[]; updatedAt: string }> { const rates = await assembleMarketRates(); return { items: rates.filter((r) => !EXCLUDED_GROUPS.has(r.group) && r.unit === 'toman').map((r) => ({ symbol: r.symbol, displayNameFa: r.displayNameFa, marketRateToman: r.value, changePercent: r.changePercent })), updatedAt: new Date().toISOString() }; }
const getCachedSymbols = safeCache(buildSymbols, FALLBACK, { key: 'money-transfer:symbols', ttl: 60, tags: ['exchange-rates', 'money-transfer'] });
export async function GET() { try { return NextResponse.json({ success: true, data: await getCachedSymbols() }); } catch { return NextResponse.json({ success: false, error: { code: 'SYMBOLS_UNAVAILABLE', message: 'فهرست ارزها موقتاً در دسترس نیست' } }, { status: 503 }); } }
