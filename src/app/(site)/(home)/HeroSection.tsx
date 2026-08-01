/**
 * HeroSection — Server Component shell (2026 redesign)
 *
 * داده‌های واقعی را از سرور جمع می‌کند و به `HeroVisual` (Client) پاس می‌دهد:
 *  - نرخ‌های زندهٔ بازار (hero rates: AFN/USD/AED)
 *  - نرخ cross USD→AFN برای calculator
 *  - تعداد صرافی‌های فعال (real DB count)
 *  - session کاربر (برای شخصی‌سازی CTA)
 *  - وضعیت freshness بازار
 */

import { auth } from '@/auth';
import { getMarketRates } from '@/actions/market-rates';
import { safeCache } from '@/lib/safe-cache';
import prisma from '@/lib/db';
import type { MarketRateItem } from '@/lib/market-rates/types';
import HeroVisual from './HeroVisual';

/**
 * symbolهایی که در کارت نرخ‌ها نمایش داده می‌شوند — به ترتیب اولویت.
 * سایت مال افغانستان است — نرخ‌های افغانستان اول:
 *  - AFGHANI_AFN → افغانی / تومان
 *  - IRAN_USD    → دلار / تومان
 *  - IRAN_AED    → درهم / تومان
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

/**
 * تعداد صرافی‌های فعال — real DB count با کش ۵ دقیقه‌ای.
 * نمایش در stats bar هیرو (proof of real platform).
 */
const getActiveExchangeCount = safeCache(
  async (): Promise<number> => {
    return prisma.exchange
      .count({ where: { status: 'ACTIVE' } })
      .catch(() => 0);
  },
  0,
  { key: 'hero:active-exchanges', ttl: 300, tags: ['rate-lists'] },
);

export default async function HeroSection() {
  const [allRates, session, activeExchangeCount] = await Promise.all([
    getMarketRates(),
    auth().catch(() => null),
    getActiveExchangeCount(),
  ]);

  const heroRates = pickHeroRates(allRates);
  const usdRate = allRates.find((r) => r.symbol === 'IRAN_USD') ?? null;
  const afnRate = allRates.find((r) => r.symbol === 'AFGHANI_AFN') ?? null;

  // cross-rate: ۱ دلار = چند افغانی
  const usdToAfn =
    usdRate && afnRate && afnRate.value > 0 ? usdRate.value / afnRate.value : null;

  // freshness anchor — برای freshness indicator در هیرو
  const freshnessAnchor = allRates.reduce<Date | null>((acc, r) => {
    const t = r.updatedAt instanceof Date ? r.updatedAt : new Date(r.updatedAt ?? 0);
    return !acc || t.getTime() > acc.getTime() ? t : acc;
  }, null);

  // نقش کاربر → CTA متفاوت
  const role = session?.user?.role as string | undefined;
  const isAuthed = !!session?.user;
  // isAuthor: هر نقشی که دسترسی داشبورد/مدیریت دارد (AUTHOR+ADMIN+OWNER+SUPERADMIN)
  const isAuthor =
    role === 'AUTHOR' || role === 'ADMIN' || role === 'OWNER' || role === 'SUPERADMIN';

  return (
    <HeroVisual
      heroRates={heroRates}
      usdRate={usdRate}
      usdToAfn={usdToAfn}
      activeExchangeCount={activeExchangeCount}
      totalRates={allRates.length}
      freshnessAnchor={freshnessAnchor}
      isAuthed={isAuthed}
      isAuthor={isAuthor}
    />
  );
}
