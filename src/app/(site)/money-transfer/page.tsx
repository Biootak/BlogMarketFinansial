import type { Metadata } from 'next';
import { getExchangeRates } from '@/actions/exchange-rates';
import { getRateLists } from '@/actions/rate-lists';
import { ExchangeRateTableView } from './ExchangeRateTableView';
import ContactCTA from '@/components/online-payment/ContactCTA';
import FAQ from './FAQ';
import RateListGrid from './RateListGrid';
import HeroConverter from './HeroConverter';
import LiveTicker from './LiveTicker';
import TrustStrip from './TrustStrip';
import FeatureList from './FeatureList';
import RateComparisonSection from './RateComparisonSection';
import ScrollReveal from './ScrollReveal';
import { loadActiveTransferProviders } from '@/lib/money-transfer/providers';
import {
  buildHeroPairs,
  computeSpreadStats,
  formatFaNumber,
  type HeroPair,
} from '@/lib/money-transfer/hero';
import {
  readMarketRatesSnapshot,
  type SnapshotItem,
} from '@/lib/market-rates/snapshot-reader';
import type { ExchangeRateData } from '@/types/types';

export const metadata: Metadata = {
  title: 'صرافی آنلاین | انتقال ارز سریع و مطمئن',
  description: 'بهترین نرخ‌های حواله ارزی برای انتقال سریع و امن پول در سراسر جهان',
};

interface HeroInitial {
  pairs: HeroPair[];
  spreadStats: ReturnType<typeof computeSpreadStats>;
  providers: { count: number; bestName: string; bestSpread: number };
}

/**
 * تبدیل یک آیتم snapshot به ExchangeRateData برای استفاده در buildHeroPairs و
 * نمایش در جدول. DB override‌ها (id, imageUrl, description, manualNote) در
 * مرحله‌ی merge اعمال می‌شوند.
 */
function snapshotToRate(s: SnapshotItem): ExchangeRateData {
  const isBuySell =
    s.buyValue != null && s.sellValue != null && s.buyValue > 0 && s.sellValue > 0;
  const updated = s.updatedAt ? new Date(s.updatedAt) : new Date();
  return {
    id: `snapshot-${s.symbol}`,
    name: s.displayNameFa,
    currency: s.symbol.replace(/^(?:IRAN|AFGHANI|GLOBAL)_/, ''),
    symbol: s.symbol,
    displayNameFa: s.displayNameFa,
    group: s.group,
    unit: s.unit,
    divisor: s.divisor,
    decimals: s.decimals,
    priority: s.priority,
    provider: s.provider,
    active: true,
    rateType: isBuySell ? 'BUY_SELL' : 'SINGLE_BULK',
    buyRate: s.buyValue != null ? String(s.buyValue) : null,
    sellRate: s.sellValue != null ? String(s.sellValue) : null,
    singleRate: s.value != null ? String(s.value) : null,
    bulkRate: null,
    imageUrl: null,
    manualNote: null,
    description: null,
    updatedAt: updated,
    createdAt: updated,
  };
}

/**
 * استراتژی dual-source (2026-07-06):
 *   - اگه snapshot ≥ 3 آیتم داشته باشه، primary می‌شه (سریع‌تر، آفلاین‌پسند).
 *     DB فقط برای override فیلدهای ادمینی مثل imageUrl/description/manualNote
 *     و برای رکوردهایی که در snapshot نیستن (admin-only).
 *   - در غیر این صورت (snapshot خالی/ناکافی/خراب) → رفتار قدیمی DB.
 *
 *   freshnessAnchor:
 *     - snapshot.generatedAt اگه موجود باشه
 *     - در غیر این صورت max(db.updatedAt)
 *     - null اگه هیچ داده‌ای نیست
 */
async function loadMarketRates(): Promise<{
  rates: ExchangeRateData[];
  freshnessAnchor: Date | null;
}> {
  const [dbRates, snapshot] = await Promise.all([
    getExchangeRates(),
    readMarketRatesSnapshot(),
  ]);

  if (!snapshot || snapshot.items.length < 3) {
    // fallback قدیمی: فقط DB
    const maxDb =
      dbRates.length > 0
        ? dbRates.reduce<Date>(
            (acc, r) =>
              new Date(r.updatedAt).getTime() > acc.getTime() ? new Date(r.updatedAt) : acc,
            new Date(dbRates[0].updatedAt),
          )
        : null;
    return { rates: dbRates, freshnessAnchor: maxDb };
  }

  // merge: snapshot primary, DB برای custom fields
  const dbBySymbol = new Map<string, ExchangeRateData>();
  for (const r of dbRates) {
    if (r.symbol) dbBySymbol.set(r.symbol, r);
  }

  const snapshotTime = snapshot.generatedAt?.getTime() ?? 0;
  const merged: ExchangeRateData[] = snapshot.items.map((s) => {
    const db = dbBySymbol.get(s.symbol);
    const base = snapshotToRate(s);
    if (!db) return base;
    // updatedAt: تازه‌ترینِ db و snapshot
    const dbTime = new Date(db.updatedAt).getTime();
    const freshest = new Date(Math.max(dbTime, snapshotTime));
    return {
      ...base,
      // DB برای id و فیلدهای ادمینی override می‌کنه
      id: db.id,
      imageUrl: db.imageUrl ?? base.imageUrl,
      manualNote: db.manualNote ?? base.manualNote,
      description: db.description ?? base.description,
      // اگه DB صریح خالی نبود، نرخ‌های DB نگه داشته می‌شن (ادمینی)
      // ولی اگه DB خالی بود، از snapshot پُر می‌شه
      buyRate: db.buyRate ?? base.buyRate,
      sellRate: db.sellRate ?? base.sellRate,
      singleRate: db.singleRate ?? base.singleRate,
      bulkRate: db.bulkRate ?? base.bulkRate,
      active: db.active ?? base.active,
      updatedAt: freshest,
    };
  });

  // رکوردهای admin-only (در DB هست ولی در snapshot نیست)
  const snapshotSymbols = new Set(snapshot.items.map((s) => s.symbol));
  for (const r of dbRates) {
    if (r.symbol && !snapshotSymbols.has(r.symbol)) {
      merged.push(r);
    }
  }

  return { rates: merged, freshnessAnchor: snapshot.generatedAt };
}

// Async server-side pre-computation of the stats the hero depends on. Doing
// this here (and not inside the client component) keeps the client bundle
// smaller and avoids redundant work on every render.
async function buildHeroInitial(
  rates: ExchangeRateData[],
): Promise<HeroInitial> {
  const [providers] = await Promise.all([loadActiveTransferProviders()]);
  const pairs = buildHeroPairs(rates);
  const spreadStats = computeSpreadStats(pairs);

  // «بهترین» provider بر مبنای کمترین spread.
  // اگه لیست خالی یا همگی spread=0، از اوّلی استفاده می‌کنیم.
  const activeProviders = [...providers].filter((p) => p.active);
  const sorted = [...activeProviders].sort(
    (a, b) => a.spreadPercent - b.spreadPercent,
  );
  const best = sorted[0];
  return {
    pairs,
    spreadStats,
    providers: {
      count: activeProviders.length,
      bestName: best?.name ?? formatFaNumber(0),
      bestSpread: best?.spreadPercent ?? 0,
    },
  };
}

// Dynamically rendered on demand — the shared site header reads auth(), which
// opts the whole (site) tree out of static generation (see (home)/page.tsx).
export default async function MoneyTransferPage() {
  const [market, rateLists] = await Promise.all([
    loadMarketRates(),
    getRateLists(),
  ]);
  const hero = await buildHeroInitial(market.rates);
  const activeRateLists = rateLists.filter((list) => list.isActive);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-x-hidden">
      {/* Hero + Live Converter (one cohesive unit) */}
      <HeroConverter
        rates={market.rates}
        pairs={hero.pairs}
        spreadStats={hero.spreadStats}
        providerCount={hero.providers.count}
        bestProvider={hero.providers.bestName}
        bestSpread={hero.providers.bestSpread}
        freshnessAnchor={market.freshnessAnchor}
      />

      {/* Live ticker — thin full-width strip right under the hero */}
      <div className="mt-3 sm:mt-4">
        <LiveTicker rates={market.rates} />
      </div>

      <div className="container py-6 sm:py-10 lg:py-14 space-y-10 sm:space-y-16 px-4 sm:px-6">
        {/* Provider Comparison — real-time quotes from TGJU/USDT/FX × Wise/Remitly/etc.
            Single most important decision-support section after the converter. */}
        <ScrollReveal>
          <section aria-labelledby="mt-compare-title">
            <RateComparisonSection />
          </section>
        </ScrollReveal>

        {/* Trust Strip — company-wide numeric metrics */}
        <ScrollReveal>
          <section aria-label="اعتمادسازی">
            <TrustStrip />
          </section>
        </ScrollReveal>

        {/* Exchange Rates Section */}
        <ScrollReveal>
          <section id="rates" className="mt-section">
            <ExchangeRateTableView exchangeRates={market.rates} />
          </section>
        </ScrollReveal>

        {/* Rate Lists Section */}
        <ScrollReveal>
          <section className="mt-section">
            <RateListGrid rateLists={activeRateLists} initialCount={10} />
          </section>
        </ScrollReveal>

        {/* Contact CTA Section */}
        <ScrollReveal>
          <section id="contact">
            <ContactCTA defaultServiceType="INTERNATIONAL_TRANSFER" />
          </section>
        </ScrollReveal>

        {/* Services Section */}
        <ScrollReveal>
          <section id="services" className="mt-section">
            <FeatureList />
          </section>
        </ScrollReveal>

        {/* FAQ Section */}
        <ScrollReveal>
          <section id="faq" className="mt-section">
            <FAQ />
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
}
