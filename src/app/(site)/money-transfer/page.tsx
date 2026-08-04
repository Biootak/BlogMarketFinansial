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

// 2026-08-02: header no longer awaits auth() (client-side session island), so
// the (site) tree is static-friendly. This page reads no request-time APIs
// (no cookies/headers/searchParams) — everything comes through safeCache with
// TTLs (market rates 60s, rate lists 300s, providers 60s). Without an explicit
// revalidate it would be statically generated at BUILD with whatever rates
// existed then → frozen prices. ISR with 60s revalidation keeps HTML cached
// while rates refresh at the same cadence as the market-rates cache.
export const revalidate = 60;

export default async function MoneyTransferPage() {
  // 2026-08-perf: سه منبع داده موازی — market + rateLists + hero همزمان.
  // قبلاً: market → hero (sequential, 2 round trips)
  // حالا: همه موازی با Promise.all — صرفه‌جویی ≈ زمان یک round trip.
  const [market, rateLists, hero] = await Promise.all([
    loadMarketRates(),
    getRateLists(),
    // hero به market نیاز دارد ولی rates داخل buildHeroInitial هم fetch می‌کند.
    // برای اینکه موازی باشد، market را جداگانه می‌کشیم و به buildHeroInitial پاس می‌دهیم.
    // loadMarketRates کش دارد — دومین فراخوانی فوری است.
    loadMarketRates().then((m) => buildHeroInitial(m.rates, m.items)),
  ]);
  const activeRateLists = rateLists.filter((list) => list.isActive);

  return (
    <div
      style={{
        minHeight: '100dvh',
        background:
          'linear-gradient(to bottom, var(--ds-bg-subtle), var(--ds-bg-primary), var(--ds-bg-subtle))',
      }}
    >
      {/* Hero + Live Converter (one cohesive unit) */}
      <HeroConverter
        pairs={hero.pairs}
        spreadStats={hero.spreadStats}
        providerCount={hero.providers.count}
        bestProvider={hero.providers.bestName}
        bestSpread={hero.providers.bestSpread}
        freshnessAnchor={market.freshnessAnchor}
      />

      {/* Live ticker — thin full-width strip right under the hero */}
      <div className="mt-2 sm:mt-3">
        <LiveTicker rates={market.items} />
      </div>

      {/* Main content — mt-section handles its own spacing via + selector */}
      <div className="container py-6 sm:py-8 lg:py-10 px-4 sm:px-6">
        {/* Provider Comparison */}
        <ScrollReveal className="mt-section">
          <section aria-labelledby="mt-compare-title">
            <RateComparisonSection />
          </section>
        </ScrollReveal>

        {/* Trust Strip */}
        <ScrollReveal className="mt-section">
          <section aria-label="اعتمادسازی">
            <TrustStrip />
          </section>
        </ScrollReveal>

        {/* Exchange Rates */}
        <ScrollReveal className="mt-section">
          <section id="rates">
            <ExchangeRateTableView rates={market.items} />
          </section>
        </ScrollReveal>

        {/* Rate Lists */}
        <ScrollReveal className="mt-section">
          <section>
            <RateListGrid rateLists={activeRateLists} liveRates={market.items} initialCount={10} />
          </section>
        </ScrollReveal>

        {/* Transfer Request Form */}
        <ScrollReveal>
          <section id="contact" className="mt-section">
            <TransferRequestCTA />
          </section>
        </ScrollReveal>

        {/* Services */}
        <ScrollReveal>
          <section id="services" className="mt-section">
            <FeatureList />
          </section>
        </ScrollReveal>

        {/* FAQ */}
        <ScrollReveal>
          <section id="faq" className="mt-section">
            <FAQ />
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
}
