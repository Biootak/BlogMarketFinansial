/**
 * /exchanges — صفحه عمومی مقایسه صرافی‌ها
 *
 *   Server Component با revalidate هر ۶۰ ثانیه.
 *   رندر تمام داده‌های واقعی از Prisma؛ المان‌های interactive کلاینت هستند.
 *
 *   ساختار (P2026 redesign — معماری 2026):
 *     1. Hero "Trading Floor" — title + ticker panel + stats (ماشین‌حساب حذف شد ۲۰۲۶-۰۷-۲۹)
 *     2. LiveRateBoard — جدول چرخشی نرخ‌ها (با Suspense)
 *     3. CurrencyPulseGrid — heatmap ارزها (interactive — کلیک → اسکرول)
 *     4. ExchangeBentoGrid — لیست بصری صرافی‌ها
 *     5. TrustStrip — اعتماد + CTA نهایی
 *
 *   نکتهٔ کلیدی معماری:
 *     • Hero: هیچ ScrollReveal — برای first paint و SEO، باید فوری visible باشد
 *     • LiveRateBoard: در Suspense پیچیده می‌شود تا سنگینی client-side block نکند
 *     • CurrencyPulseGrid: interactive — کلیک روی هر بلوک به جدول اسکرول می‌کند
 */

import ScrollReveal from '@/app/(site)/money-transfer/ScrollReveal';
import { safeCache } from '@/lib/safe-cache';
import prisma from '@/lib/db';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import CurrencyPulseGrid, { type PulseTile } from './_components/CurrencyPulseGrid';
import ExchangeBentoGrid, { type BentoExchange } from './_components/ExchangeBentoGrid';
import HeroStatsRow, { type HeroStat } from './_components/HeroStatsRow';
// ۲۰۲۶-۰۷-۲۹: RateCalculator از /exchanges حذف شد — import نیز حذف شد.
import { LiveRateBoardAsync } from './_components/LiveRateBoardAsync';
import LiveTickerPanel, { type TickerStat } from './_components/LiveTickerPanel';
import MarketTape, { type TapeItem } from './_components/MarketTape';
import TrustStrip from './_components/TrustStrip';
import s from './exchanges.module.css';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'مقایسه صرافی‌ها | تابلوی نرخ زنده',
  description:
    'مقایسه نرخ خرید و فروش ارز از صرافی‌های تأییدشده — USD، EUR، AED، GBP و بیشتر. نرخ‌ها هر ۳۰ ثانیه به‌روز می‌شوند.',
  openGraph: {
    title: 'مقایسه صرافی‌ها | تابلوی نرخ زنده',
    description: 'نرخ لحظه‌ای خرید و فروش ارز از صرافی‌های تأییدشده',
    type: 'website',
  },
};

// ─── Constants ──────────────────────────────────────────────────────────────

const CURRENCY_NAMES: Record<string, string> = {
  USD: 'دلار آمریکا',
  EUR: 'یورو',
  AED: 'درهم امارات',
  GBP: 'پوند انگلیس',
  AFN: 'افغانی',
  TRY: 'لیر ترکیه',
  SAR: 'ریال عربستان',
  CAD: 'دلار کانادا',
  AUD: 'دلار استرالیا',
  CHF: 'فرانک سوئیس',
  JPY: 'ین ژاپن',
  CNY: 'یوان چین',
  KWD: 'دینار کویت',
  IQD: 'دینار عراق',
  RUB: 'روبل روسیه',
};

const UNIT_LABEL: Record<string, string> = {
  toman: 'تومان',
  rial: 'ریال',
  afn: 'افغانی',
  usd: 'دلار',
};

const TOP_CURRENCIES_FOR_HERO = ['USD', 'EUR', 'AED', 'GBP'] as const;

// ─── Data fetching ──────────────────────────────────────────────────────────

type DecimalLike = { toString(): string };

type ExchangeWithQuotes = {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  city: string | null;
  logoUrl: string | null;
  licenseNo: string | null;
  createdAt: Date;
  ExchangeRateQuote: {
    id: string;
    currencyCode: string;
    buyRate: DecimalLike;
    sellRate: DecimalLike;
    unit: string;
    createdAt: Date;
  }[];
};

// 2026-08-perf: safeCache — بین request های یک revalidation window داده را share می‌کند
const getExchangesData = safeCache(
  async (): Promise<ExchangeWithQuotes[]> => {
    const exchanges = await prisma.exchange.findMany({
      where: { status: 'ACTIVE', showInComparison: true },
      include: {
        ExchangeRateQuote: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
      },
      orderBy: { name: 'asc' },
    });
    return exchanges as unknown as ExchangeWithQuotes[];
  },
  [],
  { key: 'exchanges-list', ttl: 60, tags: ['exchanges', 'exchange-rates'] },
);

/**
 * Spark history برای چند ارز به‌صورت batched — یک query به جای N.
 * خروجی: Map<currencyCode, Map<exchangeId, number[]>>
 *
 * ۲۰۲۶-۰۷-۲۹: بهینه‌سازی N+1. قبلاً برای هر ارز یک query جدا زده می‌شد.
 * حالا همه ارزها در یک query — performance boost قابل‌توجه برای ۱۰+ ارز.
 * 2026-08-perf: safeCache اضافه شد — cross-request dedup.
 */
const getSparkHistoryBatch = safeCache(
  async (
  exchangeIds: string[],
  currencyCodes: string[],
): Promise<Map<string, Map<string, number[]>>> => {
  const out = new Map<string, Map<string, number[]>>();
  if (exchangeIds.length === 0 || currencyCodes.length === 0) return out;
  for (const code of currencyCodes) out.set(code, new Map());

  const rows = await prisma.exchangeRateQuote.findMany({
    where: {
      exchangeId: { in: exchangeIds },
      currencyCode: { in: currencyCodes },
      status: { in: ['ACTIVE', 'EXPIRED', 'ARCHIVED'] },
    },
    select: { exchangeId: true, currencyCode: true, buyRate: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: exchangeIds.length * currencyCodes.length * 12,
  });

  // group by (currency, exchange), keep last 12 per pair, reverse to oldest-first
  const grouped = new Map<string, { ex: string; code: string; buy: number }[]>();
  for (const r of rows) {
    const buy = Number(r.buyRate);
    if (!Number.isFinite(buy)) continue;
    const key = `${r.currencyCode}::${r.exchangeId}`;
    if (!grouped.has(key)) grouped.set(key, []);
    const list = grouped.get(key);
    if (!list || list.length >= 12) continue;
    list.push({ ex: r.exchangeId, code: r.currencyCode, buy });
  }
  for (const list of grouped.values()) {
    if (list.length === 0) continue;
    const first = list[0];
    if (!first) continue;
    const currencyMap = out.get(first.code);
    if (!currencyMap) continue;
    currencyMap.set(first.ex, list.map((x) => x.buy).reverse());
  }
    return out;
  },
  new Map(),
  { key: 'exchanges-spark-batch', ttl: 60, tags: ['exchange-rates'] },
);

// ─── Pure helpers ───────────────────────────────────────────────────────────

function formatFaCount(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

function pickBestBy<T>(arr: T[], key: (t: T) => number, mode: 'min' | 'max'): T | undefined {
  if (arr.length === 0) return undefined;
  let best = arr[0] as T;
  for (let i = 1; i < arr.length; i++) {
    const cur = arr[i] as T;
    const a = key(best);
    const b = key(cur);
    best = mode === 'min' ? (b < a ? cur : best) : b > a ? cur : best;
  }
  return best;
}

function buildTapeItems(exchanges: ExchangeWithQuotes[]): TapeItem[] {
  const flat: TapeItem[] = [];
  for (const ex of exchanges) {
    for (const q of ex.ExchangeRateQuote) {
      const buy = Number(q.buyRate);
      const sell = Number(q.sellRate);
      if (!Number.isFinite(buy) || !Number.isFinite(sell) || buy <= 0 || sell <= 0) continue;
      if (sell < buy) continue;
      const spreadPct = ((sell - buy) / buy) * 100;
      flat.push({
        id: q.id,
        code: q.currencyCode,
        name: CURRENCY_NAMES[q.currencyCode] ?? q.currencyCode,
        unit: UNIT_LABEL[q.unit] ?? q.unit,
        buy,
        sell,
        spreadPct,
        exchangeName: ex.displayName ?? ex.name,
      });
    }
  }
  return flat.slice(0, 20);
}

function buildTickerStats(exchanges: ExchangeWithQuotes[]): TickerStat[] {
  return TOP_CURRENCIES_FOR_HERO.map((code) => {
    const allQuotes = exchanges
      .flatMap((ex) =>
        ex.ExchangeRateQuote.filter((q) => q.currencyCode === code).map((q) => ({
          buy: Number(q.buyRate),
          sell: Number(q.sellRate),
          unit: q.unit,
          ex: ex,
        })),
      )
      .filter((q) => q.buy > 0 && q.sell > 0);

    if (allQuotes.length === 0) {
      return {
        code,
        name: CURRENCY_NAMES[code] ?? code,
        bestBuy: 0,
        bestSell: 0,
        bestBuyExchange: '—',
        bestSellExchange: '—',
        unit: 'تومان',
      };
    }

    const bestBuy = pickBestBy(allQuotes, (q) => q.buy, 'max');
    const bestSell = pickBestBy(allQuotes, (q) => q.sell, 'min');

    return {
      code,
      name: CURRENCY_NAMES[code] ?? code,
      bestBuy: bestBuy?.buy ?? 0,
      bestSell: bestSell?.sell ?? 0,
      bestBuyExchange: bestBuy?.ex.displayName ?? bestBuy?.ex.name ?? '—',
      bestSellExchange: bestSell?.ex.displayName ?? bestSell?.ex.name ?? '—',
      unit: UNIT_LABEL[bestBuy?.unit ?? 'toman'] ?? 'تومان',
    };
  });
}

/**
 * buildPulseTiles per currency.
 * Δ محاسبه واقعی: (last - first) / first * 100  از تاریخچهٔ صرافی‌ها.
 * ۲۰۲۶-۰۷-۲۹: قبلاً هش pseudo-Δ بود (غیرواقعی). حالا از تاریخچهٔ واقعی DB.
 * همچنین batchedHistory از فراخواننده می‌گیرد (N+1 → ۱ query).
 */
async function buildPulseTiles(
  exchanges: ExchangeWithQuotes[],
  batchedHistory: Map<string, Map<string, number[]>>,
): Promise<PulseTile[]> {
  const map = new Map<
    string,
    {
      buyQuotes: { buy: number; sell: number; unit: string; ex: ExchangeWithQuotes }[];
    }
  >();

  for (const ex of exchanges) {
    for (const q of ex.ExchangeRateQuote) {
      const buy = Number(q.buyRate);
      const sell = Number(q.sellRate);
      if (!Number.isFinite(buy) || !Number.isFinite(sell) || buy <= 0 || sell <= 0) continue;
      if (!map.has(q.currencyCode)) map.set(q.currencyCode, { buyQuotes: [] });
      map.get(q.currencyCode)?.buyQuotes.push({ buy, sell, unit: q.unit, ex });
    }
  }

  // ۲۰۲۶-۰۷-۲۹: استفاده از batchedHistory — بدون query اضافی
  const deltaMap = new Map<string, number>();
  for (const code of map.keys()) {
    const seriesMap = batchedHistory.get(code);
    if (!seriesMap) {
      deltaMap.set(code, 0);
      continue;
    }
    let delta = 0;
    let count = 0;
    for (const series of seriesMap.values()) {
      if (series.length < 2) continue;
      const first = series[0];
      const last = series[series.length - 1];
      if (!first || !last || first <= 0) continue;
      delta += ((last - first) / first) * 100;
      count++;
    }
    deltaMap.set(code, count > 0 ? delta / count : 0);
  }

  const tiles: PulseTile[] = [];
  for (const [code, { buyQuotes }] of map) {
    if (buyQuotes.length === 0) continue;
    const bestBuy = pickBestBy(buyQuotes, (q) => q.buy, 'max');
    const bestSell = pickBestBy(buyQuotes, (q) => q.sell, 'min');
    if (!bestBuy || !bestSell) continue;

    tiles.push({
      code,
      name: CURRENCY_NAMES[code] ?? code,
      bestBuy: bestBuy.buy,
      bestSell: bestSell.sell,
      buyExchange: bestBuy.ex.displayName ?? bestBuy.ex.name,
      sellExchange: bestSell.ex.displayName ?? bestSell.ex.name,
      quoteCount: buyQuotes.length,
      delta: deltaMap.get(code) ?? 0,
      unit: UNIT_LABEL[bestBuy.unit] ?? 'تومان',
    });
  }
  return tiles;
}

async function buildBentoExchanges(
  exchanges: ExchangeWithQuotes[],
  usdSparks: Map<string, number[]>,
): Promise<BentoExchange[]> {
  // ۲۰۲۶-۰۷-۲۹: usdSparks از batched query در فراخواننده می‌آید.
  // قبلاً اینجا یک query جدا می‌زد — حالا اشتراکی با buildPulseTiles.
  // ۲۰۲۶-۰۷-۲۹: همه صرافی‌های فعال (حتی بدون USD) نمایش داده می‌شوند.
  const enriched: BentoExchange[] = exchanges.map((ex) => {
    const usdQuotes = ex.ExchangeRateQuote.filter((q) => q.currencyCode === 'USD');
    const currencies = new Set(ex.ExchangeRateQuote.map((q) => q.currencyCode));
    const usdBuy = usdQuotes[0] ? Number(usdQuotes[0].buyRate) : null;
    const usdSell = usdQuotes[0] ? Number(usdQuotes[0].sellRate) : null;
    return {
      id: ex.id,
      slug: ex.slug,
      name: ex.name,
      displayName: ex.displayName,
      city: ex.city,
      logoUrl: ex.logoUrl,
      licenseNo: ex.licenseNo,
      usdBuy,
      usdSell,
      currencyCount: currencies.size,
      spark: usdSparks.get(ex.id) ?? [],
      rankScore: ex.ExchangeRateQuote.length,
    };
  });
  return enriched;
}

async function buildHeroStats(
  exchanges: ExchangeWithQuotes[],
  pulseTiles: PulseTile[],
): Promise<HeroStat[]> {
  const totalQuotes = exchanges.reduce((sum, e) => sum + e.ExchangeRateQuote.length, 0);
  const usdTile = pulseTiles.find((t) => t.code === 'USD');
  const spreadAvg =
    exchanges
      .flatMap((e) => e.ExchangeRateQuote)
      .reduce((acc, q) => {
        const buy = Number(q.buyRate);
        const sell = Number(q.sellRate);
        if (!Number.isFinite(buy) || !Number.isFinite(sell) || buy <= 0 || sell <= 0) return acc;
        return acc + ((sell - buy) / buy) * 100;
      }, 0) / Math.max(totalQuotes, 1);

  return [
    {
      label: 'صرافی فعال',
      value: formatFaCount(exchanges.length),
      hint: 'تأییدشده',
    },
    {
      label: 'نرخ ثبت‌شده',
      value: formatFaCount(totalQuotes),
      hint: 'ACTIVE',
    },
    {
      label: 'میانگین اسپرد',
      value: spreadAvg ? `${spreadAvg.toFixed(2)}٪` : '—',
      hint: 'بازار',
    },
    {
      label: 'بهترین خرید USD',
      value: usdTile ? formatFaCount(usdTile.bestBuy) : '—',
      hint: usdTile ? usdTile.buyExchange : '—',
      tone: 'accent',
    },
  ];
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function ExchangesPage() {
  const exchanges = await getExchangesData();

  // ۲۰۲۶-۰۷-۲۹: pre-compute currencies و یک batched query مشترک
  // برای buildPulseTiles (همه ارزها) و buildBentoExchanges (فقط USD spark).
  const allCurrencyCodes = [
    ...new Set(exchanges.flatMap((e) => e.ExchangeRateQuote.map((q) => q.currencyCode))),
  ];
  const allExIds = exchanges.map((e) => e.id);
  const batchedHistory = await getSparkHistoryBatch(allExIds, allCurrencyCodes);

  const tapeItems = buildTapeItems(exchanges);
  const tickerStats = buildTickerStats(exchanges);
  const pulseTiles = await buildPulseTiles(exchanges, batchedHistory);
  const bentoItems = await buildBentoExchanges(exchanges, batchedHistory.get('USD') ?? new Map());
  const heroStats = await buildHeroStats(exchanges, pulseTiles);

  const hasQuotes = exchanges.some((e) => e.ExchangeRateQuote.length > 0);

  return (
    <main className={s.page} dir="rtl">
      {/* ═══ HERO — Trading Floor (no ScrollReveal — first paint must be visible) ═══ */}
      <section className={s.hero} aria-label="مقایسه زنده نرخ صرافی‌ها">
        <div className={s.heroBg} aria-hidden>
          <div className={s.heroGrid} />
          <div className={s.heroGlowA} />
          <div className={s.heroGlowB} />
          <div className={s.heroVignette} />
        </div>

        <div className={s.heroInner}>
          <div className={s.heroTop}>
            <span className={s.eyebrow}>
              <span className={s.eyebrowDot} aria-hidden />
              تابلوی نرخ زنده — بازار آزاد
            </span>

            <h1 className={s.headline}>
              نرخ لحظه‌ای صرافی‌های تأییدشده،
              <br />
              <span className={s.headlineAccent}>شفاف و قابل مقایسه</span>
            </h1>

            <p className={s.sub}>
              نرخ خرید و فروش واقعی از {formatFaCount(exchanges.length)} صرافی فعال — به‌روز هر ۳۰
              ثانیه، با شفافیت کامل اسپرد و زمان انقضای هر پیشنهاد.
            </p>
          </div>

          {/*
            حذف ماشین‌حساب از این صفحه (۲۰۲۶-۰۷-۲۹، طبق درخواست صریح کاربر):
            ماشین‌حساب میانگین/بهترین‌نرخ چون صرافی‌ها نرخ‌های متفاوت خودشان را ثبت می‌کنند،
            کاربر را به سمت عددی هدایت می‌کرد که عملاً معامله نمی‌شود. کاربر برای
            محاسبهٔ دقیق باید به صفحهٔ صرافی (`/exchanges/[slug]`) برود.
          */}
          {hasQuotes && (
            <div className={s.calcGrid}>
              <div className={`${s.calcCol} ${s.calcColFull}`}>
                <LiveTickerPanel stats={tickerStats} />
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className={s.statsWrap}>
            <HeroStatsRow stats={heroStats} />
          </div>

          <p className={s.heroFoot}>
            قیمت‌ها توسط صرافی‌های دارای مجوز ثبت می‌شوند. پلتفرم هیچ دخالتی در قیمت‌گذاری ندارد.
          </p>
        </div>

        {/* Market tape (full bleed, edge-to-edge) */}
        {tapeItems.length > 0 && (
          <div className={s.tapeEdge}>
            <MarketTape items={tapeItems} headLabel="نوار زنده بازار" />
          </div>
        )}
      </section>

      {/* ═══ LIVE RATE BOARD — Suspense for fast first paint ═══════════════ */}
      <section className={s.section} aria-label="نرخ‌های زنده">
        <div className={s.sectionInner}>
          <ScrollReveal>
            <Suspense
              fallback={
                <div className={s.rateBoardFallback} aria-busy="true">
                  در حال بارگذاری تابلوی نرخ‌ها…
                </div>
              }
            >
              {/* id="rate-board" در LiveRateBoardAsync تعریف شده
                  (برای اسکرول CurrencyPulseGrid). */}
              <LiveRateBoardAsync />
            </Suspense>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ CURRENCY PULSE — Heatmap (interactive) ══════════════════════ */}
      {pulseTiles.length > 0 && (
        <section className={s.section} aria-label="نگاه کلی به بازار">
          <div className={s.sectionInner}>
            <ScrollReveal>
              <header className={s.pulseHeader}>
                <div>
                  <span className={s.pulseEyebrow}>
                    <span className={s.pulseEyebrowDot} aria-hidden />
                    نگاه کلی به بازار
                  </span>
                  <h2 className={s.pulseTitle}>همه ارزها در یک نگاه</h2>
                  <p className={s.pulseSub}>
                    اندازه هر بلوک نشان‌دهنده تعداد صرافی‌های فعال برای آن ارز است. روی هر ارز بزنید
                    تا تابلوی نرخ‌ها به آن ارز تغییر کند.
                  </p>
                </div>
              </header>
            </ScrollReveal>
            <ScrollReveal delay={120}>
              <CurrencyPulseGrid tiles={pulseTiles} />
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ═══ EXCHANGE BENTO GRID ══════════════════════════════════════════ */}
      {bentoItems.length > 0 && (
        <section className={s.section} aria-label="صرافی‌های تأییدشده">
          <div className={s.sectionInner}>
            <ScrollReveal>
              <ExchangeBentoGrid items={bentoItems} />
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ═══ EMPTY STATE — no exchanges at all ═════════════════════════════ */}
      {exchanges.length === 0 && (
        <section className={s.section}>
          <div className={s.sectionInner}>
            <ScrollReveal>
              <output className={s.emptyState}>
                <h2 className={s.emptyTitle}>صرافی فعالی وجود ندارد</h2>
                <p className={s.emptySub}>
                  در حال حاضر صرافی فعالی در سیستم ثبت نشده است. بعداً مراجعه کنید.
                </p>
              </output>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ═══ EMPTY STATE — exchanges exist but no live quotes ════════════ */}
      {exchanges.length > 0 && !hasQuotes && (
        <section className={s.section}>
          <div className={s.sectionInner}>
            <ScrollReveal>
              <output className={s.emptyState}>
                <h2 className={s.emptyTitle}>نرخ لحظه‌ای موجود نیست</h2>
                <p className={s.emptySub}>
                  {formatFaCount(exchanges.length)} صرافی فعال در سیستم وجود دارد، اما در حال حاضر
                  هیچ نرخ فعالی ثبت نشده است. نرخ‌ها معمولاً هر ۳۰ ثانیه به‌روز می‌شوند.
                </p>
              </output>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ═══ TRUST STRIP + FINAL CTA ══════════════════════════════════════ */}
      <TrustStrip
        heading="چرا این تابلو قابل اعتماد است"
        subheading="تمام صرافی‌ها پس از احراز هویت حقوقی و بررسی مجوز بانک مرکزی در فهرست قرار می‌گیرند."
        items={[
          {
            icon: 'shield',
            title: 'صرافی‌های دارای مجوز',
            desc: 'فقط صرافی‌هایی که مدارک و مجوز رسمی ارائه کرده‌اند نمایش داده می‌شوند.',
          },
          {
            icon: 'clock',
            title: 'نرخ‌های منقضی‌شده حذف می‌شوند',
            desc: 'هر پیشنهاد پس از پایان اعتبار به‌طور خودکار از تابلو خارج می‌شود.',
          },
          {
            icon: 'eye',
            title: 'شفافیت کامل اسپرد',
            desc: 'اختلاف خرید و فروش هر صرافی به‌صراحت نمایش داده می‌شود.',
          },
          {
            icon: 'users',
            title: 'بدون مداخله پلتفرم',
            desc: 'قیمت‌گذاری توسط خود صرافی‌ها انجام می‌شود؛ ما فقط نمایش می‌دهیم.',
          },
        ]}
        ctaLabel="صرافی خود را ثبت کنید"
        ctaHref="/apply-exchange"
        ctaHint="عضویت رایگان — بررسی مدارک در کمتر از ۲ روز کاری."
      />
    </main>
  );
}
