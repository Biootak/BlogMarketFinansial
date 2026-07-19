import { fetchCryptoTickerRates } from '@/actions/fetchCryptoTickerRates';
import { getMarketRates } from '@/actions/market-rates';
import { getRateLists } from '@/actions/rate-lists';
import TransferRequestCTA from '@/components/money-transfer/TransferRequestCTA';
import type { MarketRateItem } from '@/lib/market-rates';
import {
  type HeroPair,
  buildCryptoPairs,
  buildHeroPairs,
  buildSarafiPairs,
  computeSpreadStats,
  formatFaNumber,
} from '@/lib/money-transfer/hero';
import { loadActiveTransferProviders } from '@/lib/money-transfer/providers';
import type { ExchangeRateData } from '@/types/types';
import type { Metadata } from 'next';
import { ExchangeRateTableView } from './ExchangeRateTableView';
import FAQ from './FAQ';
import FeatureList from './FeatureList';
import HeroConverter from './HeroConverter';
import LiveTicker from './LiveTicker';
import RateComparisonSection from './RateComparisonSection';
import RateListGrid from './RateListGrid';
import ScrollReveal from './ScrollReveal';
import TrustStrip from './TrustStrip';

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
 * تبدیل یک MarketRateItem به ExchangeRateData — فقط برای HeroConverter که
 * هنوز به ExchangeRateData نیاز دارد.
 * LiveTicker و ExchangeRateTableView مستقیماً MarketRateItem[] می‌گیرند.
 */
function rateItemToExchangeRate(r: MarketRateItem): ExchangeRateData {
  const now = new Date();
  return {
    id: `live-${r.symbol}`,
    name: r.displayNameFa,
    currency: r.symbol.replace(/^(?:IRAN|AFGHANI|GLOBAL)_/, ''),
    symbol: r.symbol,
    displayNameFa: r.displayNameFa,
    group: r.group,
    unit: r.unit,
    divisor: r.divisor,
    decimals: r.decimals,
    priority: r.priority,
    provider: r.provider,
    active: true,
    rateType: r.buyValue != null && r.sellValue != null ? 'BUY_SELL' : 'SINGLE_BULK',
    buyRate: r.buyValue != null ? String(r.buyValue) : null,
    sellRate: r.sellValue != null ? String(r.sellValue) : null,
    singleRate: String(r.value),
    bulkRate: null,
    imageUrl: null,
    manualNote: null,
    description: null,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt : new Date(r.updatedAt ?? now),
    createdAt: now,
  };
}

/**
 * منبع اصلی نرخ‌ها: assembleMarketRates() با کش ۶۰ ثانیه‌ای.
 * خروجی: MarketRateItem[] (raw) + ExchangeRateData[] (برای HeroConverter)
 */
async function loadMarketRates(): Promise<{
  items: MarketRateItem[];
  rates: ExchangeRateData[];
  freshnessAnchor: Date | null;
}> {
  const items = await getMarketRates();
  if (items.length === 0) {
    return { items: [], rates: [], freshnessAnchor: null };
  }
  const rates = items.map(rateItemToExchangeRate);
  // freshnessAnchor = تازه‌ترین updatedAt در آیتم‌ها
  const anchor = items.reduce<Date | null>((acc, r) => {
    const t = r.updatedAt instanceof Date ? r.updatedAt : new Date(r.updatedAt ?? 0);
    return !acc || t.getTime() > acc.getTime() ? t : acc;
  }, null);
  return { items, rates, freshnessAnchor: anchor };
}

// Async server-side pre-computation of the stats the hero depends on. Doing
// this here (and not inside the client component) keeps the client bundle
// smaller and avoids redundant work on every render.
async function buildHeroInitial(
  rates: ExchangeRateData[],
  marketItems: MarketRateItem[],
): Promise<HeroInitial> {
  const [providers, cryptoResult] = await Promise.all([
    loadActiveTransferProviders(),
    fetchCryptoTickerRates(),
  ]);

  // ارزهای forex+minor از DB/TGJU (تومان-based)
  const fiatPairs = buildHeroPairs(rates);

  // ارزهای دیجیتال از Exir — pivot: USDT/تومان
  const usdtPair = fiatPairs.find((p) => p.code === 'USD');
  const usdtToman = usdtPair?.buy ?? 0;
  const cryptoPairs =
    cryptoResult.success && cryptoResult.data && cryptoResult.data.length > 0
      ? buildCryptoPairs(cryptoResult.data, usdtToman)
      : [];

  // ارزهای سرای شاهزاده (sarafi.af) — تب افغانی، واحد AFN
  const sarafiPairs = buildSarafiPairs(marketItems);

  const pairs = [...fiatPairs, ...cryptoPairs, ...sarafiPairs];
  const spreadStats = computeSpreadStats(pairs);

  // «بهترین» provider بر مبنای کمترین spread.
  // اگه لیست خالی یا همگی spread=0، از اوّلی استفاده می‌کنیم.
  const activeProviders = [...providers].filter((p) => p.active);
  const sorted = [...activeProviders].sort((a, b) => a.spreadPercent - b.spreadPercent);
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
  const [market, rateLists] = await Promise.all([loadMarketRates(), getRateLists()]);
  const hero = await buildHeroInitial(market.rates, market.items);
  const activeRateLists = rateLists.filter((list) => list.isActive);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero + Live Converter (one cohesive unit) */}
      <HeroConverter
        pairs={hero.pairs}
        spreadStats={hero.spreadStats}
        providerCount={hero.providers.count}
        bestProvider={hero.providers.bestName}
        bestSpread={hero.providers.bestSpread}
        freshnessAnchor={market.freshnessAnchor}
      />

      {/* Live ticker — thin full-width strip right under the hero.
          مستقیماً از MarketRateItem[] (نه ExchangeRateData) تا واحد + changePercent درست باشد. */}
      <div className="mt-3 sm:mt-4">
        <LiveTicker
          rates={market.items}
          freshnessAnchorISO={market.freshnessAnchor?.toISOString() ?? null}
        />
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

        {/* Exchange Rates Section — مستقیماً از MarketRateItem[] */}
        <ScrollReveal>
          <section id="rates" className="mt-section">
            <ExchangeRateTableView rates={market.items} />
          </section>
        </ScrollReveal>

        {/* Rate Lists Section */}
        <ScrollReveal>
          <section className="mt-section">
            <RateListGrid rateLists={activeRateLists} liveRates={market.items} initialCount={10} />
          </section>
        </ScrollReveal>

        {/* Transfer Request Form — dedicated hawala form (replaces generic ContactCTA) */}
        <ScrollReveal>
          <section id="contact">
            <TransferRequestCTA />
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
