// src/lib/market-rates/usdt.ts
// جدا شده از src/lib/exir-crypto-rates.ts در بازسازی.

import { fetchCryptoTickerRates } from '@/actions/fetchCryptoTickerRates';
import { rialToToman } from '@/lib/market-rates/units';

export interface UsdtRate {
  /** تومان (نه ریال) */
  toman: number;
  /** درصد تغییر */
  change: number;
}

export async function getUsdtRate(): Promise<UsdtRate | null> {
  try {
    const r = await fetchCryptoTickerRates();
    if (!r.success || !r.data) return null;
    const usdt = r.data.find((x) => x.symbol.toUpperCase() === 'USDT');
    if (!usdt) return null;
    const irr = usdt.irrPrice; // Exir: ریال
    if (!Number.isFinite(irr) || irr <= 0) return null;
    return { toman: rialToToman(irr), change: usdt.change }; // Exir → Rial → Toman
  } catch {
    return null;
  }
}
