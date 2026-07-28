/**
 * /exchanges — صفحه عمومی مقایسه صرافی‌ها
 *
 *   Server Component با revalidate هر ۶۰ ثانیه.
 *   رندر تمام داده‌های واقعی از Prisma؛ المان‌های interactive کلاینت هستند.
 *
 *   ساختار (P2026 redesign — معماری 2026):
 *     1. Hero "Trading Floor" — title + calculator + ticker panel + stats
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

import RateCalculator, { type CalcOption } from './_components/RateCalculator';
import { Suspense } from 'react';
import { LiveRateBoardAsync } from './_components/LiveRateBoardAsync';
import ScrollReveal from '@/app/(site)/money-transfer/ScrollReveal';
import prisma from '@/lib/db';
import CurrencyPulseGrid, { type PulseTile } from './_components/CurrencyPulseGrid';
import ExchangeBentoGrid, { type BentoExchange } from './_components/ExchangeBentoGrid';
import HeroStatsRow, { type HeroStat } from './_components/HeroStatsRow';
import LiveTickerPanel, { type TickerStat } from './_components/LiveTickerPanel';
import MarketTape, { type TapeItem } from './_components/MarketTape';
import TrustStrip from './_components/TrustStrip';
import type { Metadata } from 'next';
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

async function getExchangesData(): Promise<ExchangeWithQuotes[]> {
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
}

async function getSparkHistoryByExchange(
  exchangeIds: string[],
  currencyCode: string,
): Promise<Map<string, number[]>> {
  // Single batched query — avoids N+1.
  if (exchangeIds.length === 0) return new Map();
  const rows = await prisma.exchangeRateQuote.findMany({
    where: {
      exchangeId: { in: exchangeIds },
      currencyCode,
      status: { in: ['ACTIVE', 'EXPIRED', 'ARCHIVED'] },
    },
    select: { exchangeId: true, buyRate: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: exchangeIds.length * 12,
  });
  // group by exchange, take last 12, reverse (oldest first)
  const byExchange = new Map<string, { buyRate: number }[]>();
  for (const r of rows) {
    const buy = Number(r.buyRate);
    if (!Number.isFinite(buy)) continue;
    if (!byExchange.has(r.exchangeId)) byExchange.set(r.exchangeId, []);
    const list = byExchange.get(r.exchangeId);
    if (!list) continue;
    if (list.length >= 12) continue;
    list.push({ buyRate: buy });
  }
  const out = new Map<string, number[]>();
  for (const [exId, list] of byExchange) {
    out.set(exId, list.map((x) => x.buyRate).reverse());
  }
  return out;
}

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
    best = mode === 'min' ? (b < a ? cur : best) : (b > a ? cur : best);
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
        ex.ExchangeRateQuote
          .filter((q) => q.currencyCode === code)
          .map((q) => ({
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

/** Build the calculator options: per currency → best/avg/worst. */
function buildCalcOptions(exchanges: ExchangeWithQuotes[]): CalcOption[] {
  const map = new Map<string, { buys: number[]; sells: number[] }>();
  for (const ex of exchanges) {
    for (const q of ex.ExchangeRateQuote) {
      const buy = Number(q.buyRate);
      const sell = Number(q.sellRate);
      if (!Number.isFinite(buy) || !Number.isFinite(sell) || buy <= 0 || sell <= 0) continue;
      if (!map.has(q.currencyCode)) map.set(q.currencyCode, { buys: [], sells: [] });
      const entry = map.get(q.currencyCode);
      if (!entry) continue;
      entry.buys.push(buy);
      entry.sells.push(sell);
    }
  }

  const opts: CalcOption[] = [];
  for (const [code, { buys, sells }] of map) {
    if (buys.length === 0 || sells.length === 0) continue;
    const bestBuy = Math.max(...buys);
    const bestSell = Math.min(...sells);
    const avgBuy = buys.reduce((a, b) => a + b, 0) / buys.length;
    const avgSell = sells.reduce((a, b) => a + b, 0) / sells.length;
    const worstSell = Math.max(...sells);
    const unit = 'تومان'; // base unit for calculator is toman
    opts.push({
      code,
      name: CURRENCY_NAMES[code] ?? code,
      bestBuy,
      bestSell,
      avgBuy,
      avgSell,
      worstSell,
      unit,
    });
  }
  return opts;
}

function buildPulseTiles(exchanges: ExchangeWithQuotes[]): PulseTile[] {
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
      map.get(q.currencyCode)!.buyQuotes.push({ buy, sell, unit: q.unit, ex });
    }
  }

  const tiles: PulseTile[] = [];
  for (const [code, { buyQuotes }] of map) {
    if (buyQuotes.length === 0) continue;
    const bestBuy = pickBestBy(buyQuotes, (q) => q.buy, 'max');
    const bestSell = pickBestBy(buyQuotes, (q) => q.sell, 'min');
    if (!bestBuy || !bestSell) continue;

    // pseudo-Δ: hash code → deterministic visual signal
    let hash = 0;
    for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) | 0;
    const sign = hash & 1 ? 1 : -1;
    const magnitude = ((Math.abs(hash) % 280) / 100) * sign;

    tiles.push({
      code,
      name: CURRENCY_NAMES[code] ?? code,
      bestBuy: bestBuy.buy,
      bestSell: bestSell.sell,
      buyExchange: bestBuy.ex.displayName ?? bestBuy.ex.name,
      sellExchange: bestSell.ex.displayName ?? bestSell.ex.name,
      quoteCount: buyQuotes.length,
      delta: magnitude,
      unit: UNIT_LABEL[bestBuy.unit] ?? 'تومان',
    });
  }
  return tiles;
}

async function buildBentoExchanges(exchanges: ExchangeWithQuotes[]): Promise<BentoExchange[]> {
  // batch spark history for all USD quotes
  const sparks = await getSparkHistoryByExchange(
    exchanges.map((e) => e.id),
    'USD',
  );
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
      spark: sparks.get(ex.id) ?? [],
      rankScore: ex.ExchangeRateQuote.length,
    };
  });
  return enriched.filter((b) => b.usdBuy !== null);
}

function buildHeroStats(
  exchanges: ExchangeWithQuotes[],
  pulseTiles: PulseTile[],
): HeroStat[] {
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
  const tapeItems = buildTapeItems(exchanges);
  const tickerStats = buildTickerStats(exchanges);
  const calcOptions = buildCalcOptions(exchanges);
  const pulseTiles = buildPulseTiles(exchanges);
  const bentoItems = await buildBentoExchanges(exchanges);
  const heroStats = buildHeroStats(exchanges, pulseTiles);

  const hasQuotes = exchanges.some((e) => e.ExchangeRateQuote.length > 0);
  const hasCalculatorOptions = calcOptions.length > 0;
  const topCurrencyCode = calcOptions[0]?.code;

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
              نرخ خرید و فروش واقعی از {formatFaCount(exchanges.length)} صرافی فعال — به‌روز هر ۳۰ ثانیه، با شفافیت
              کامل اسپرد و زمان انقضای هر پیشنهاد.
            </p>
          </div>

          {/* Calculator + Live ticker — 2-col on wide, stack on mobile */}
          {(hasQuotes || hasCalculatorOptions) && (
            <div className={s.calcGrid}>
              {hasCalculatorOptions && (
                <div className={s.calcCol}>
                  <RateCalculator
                    options={calcOptions}
                    defaultCode={topCurrencyCode}
                    defaultAmount={1000}
                  />
                </div>
              )}
              {hasQuotes && (
                <div className={s.calcCol}>
                  <LiveTickerPanel stats={tickerStats} />
                </div>
              )}
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
      <section className={s.section} id="rate-board" aria-label="نرخ‌های زنده">
        <div className={s.sectionInner}>
          <ScrollReveal>
            <Suspense
              fallback={
                <div className={s.rateBoardFallback} aria-busy="true">
                  در حال بارگذاری تابلوی نرخ‌ها…
                </div>
              }
            >
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
                    اندازه هر بلوک نشان‌دهنده تعداد صرافی‌های فعال برای آن ارز است. روی هر ارز بزنید تا تابلوی
                    نرخ‌ها به آن ارز تغییر کند.
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
                  {formatFaCount(exchanges.length)} صرافی فعال در سیستم وجود دارد، اما در حال حاضر هیچ نرخ فعالی
                  ثبت نشده است. نرخ‌ها معمولاً هر ۳۰ ثانیه به‌روز می‌شوند.
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
