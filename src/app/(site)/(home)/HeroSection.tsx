/**
 * HeroSection — Server Component shell
 *
 * داده‌های واقعی نرخ ارز را از `getMarketRates()` می‌خواند و به
 * `HeroVisual` (Client Component) پاس می‌دهد.
 */

import { getMarketRates } from '@/actions/market-rates';
import type { MarketRateItem } from '@/lib/market-rates/types';
import HeroVisual from './HeroVisual';

/**
 * symbolهایی که در کارت نرخ‌ها نمایش داده می‌شوند — به ترتیب اولویت.
 *
 * سایت مال افغانستان است — نرخ‌های افغانستان اول:
 * - AFGHANI_AFN  → افغانی / تومان — مهم‌ترین نرخ برای کاربر افغانستانی
 * - IRAN_USD     → دلار / تومان — مرجع بین‌المللی
 * - IRAN_AED     → درهم / تومان — پرکاربرد برای حواله
 */
const HERO_RATE_SYMBOLS = ['AFGHANI_AFN', 'IRAN_USD', 'IRAN_AED'];

function pickHeroRates(rates: MarketRateItem[]): MarketRateItem[] {
  const picked: MarketRateItem[] = [];
  for (const sym of HERO_RATE_SYMBOLS) {
    const found = rates.find((r) => r.symbol === sym);
    if (found) picked.push(found);
  }
  return picked;
}

export default async function HeroSection() {
  const allRates = await getMarketRates();
  const heroRates = pickHeroRates(allRates);

  // نرخ USD/IRR برای کارت دوم (محاسبه حواله)
  const usdRate = allRates.find((r) => r.symbol === 'IRAN_USD') ?? null;
  const afnRate = allRates.find((r) => r.symbol === 'AFGHANI_AFN') ?? null;

  // cross-rate: ۱ دلار = چند افغانی
  // usdRate.value = تومان/دلار ÷ afnRate.value = تومان/افغانی → AFN/USD
  // مثال: 188,400 ÷ 2,900 ≈ 64.97 AFN per USD
  const usdToAfn = usdRate && afnRate && afnRate.value > 0 ? usdRate.value / afnRate.value : null;

  return <HeroVisual heroRates={heroRates} usdRate={usdRate} usdToAfn={usdToAfn} />;
}
