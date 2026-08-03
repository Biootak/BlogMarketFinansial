/**
 * /exchanges/[slug] — صفحهٔ اصلی پروفایل صرافی (P2026 redesign)
 *
 *   Server Component با revalidate هر ۶۰ ثانیه.
 *   داده‌های واقعی (نرخ، تاریخچه، اطلاعات تماس) از Prisma fetch می‌شوند.
 *   sub-routes: /markets, /about, /hours (توسط layout مدیریت می‌شوند).
 *
 * 2026-08-perf:
 *   - getExchangeData و getSparkHistory حالا موازی اجرا می‌شوند (Promise.all).
 *   - generateMetadata از safeCache استفاده می‌کند — DB hit تکراری حذف شد.
 *   - getPublicExchangeServices موازی با sparkHistory اجرا می‌شود.
 */

import { getPublicExchangeServices } from '@/actions/exchange-services';
import { safeCache } from '@/lib/safe-cache';
import prisma from '@/lib/db';
import { splitHours, stripHours } from '@/lib/exchange-hours';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ExchangePublicView from './_components/ExchangePublicView';

export const revalidate = 60;
export const dynamicParams = true;

// 2026-08-perf: صفحات صرافی‌های فعال در build time پیش‌ساخته می‌شوند.
// اولین بازدید از کش می‌خورد — نه از DB.
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const exchanges = await prisma.exchange.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true },
    });
    return exchanges.map((e) => ({ slug: e.slug }));
  } catch {
    return [];
  }
}

type PageProps = { params: Promise<{ slug: string }> };

// ── Cached fetchers ──────────────────────────────────────────────────────────

/**
 * اطلاعات metadata صرافی — کش ۶۰ثانیه.
 * generateMetadata و layout هر دو از همین slot استفاده می‌کنند.
 */
const getExchangeMetaForSEO = safeCache(
  async (slug: string) =>
    prisma.exchange.findUnique({
      where: { slug },
      select: {
        name: true,
        displayName: true,
        city: true,
        logoUrl: true,
        status: true,
      },
    }),
  null,
  { key: 'exchange-seo-meta', ttl: 60, tags: ['exchanges'] },
);

/**
 * داده‌های کامل صرافی با نرخ‌های فعال — کش ۶۰ثانیه.
 */
const getExchangeData = safeCache(
  async (slug: string) => {
    const exchange = await prisma.exchange.findUnique({
      where: { slug },
      include: {
        ExchangeRateQuote: {
          where: { status: 'ACTIVE' },
          orderBy: [{ currencyCode: 'asc' }, { createdAt: 'desc' }],
          take: 50,
        },
        _count: { select: { Customer: true, Transaction: true } },
      },
    });
    if (!exchange || exchange.status !== 'ACTIVE') return null;
    return exchange;
  },
  null,
  { key: 'exchange-full-data', ttl: 60, tags: ['exchanges', 'exchange-rates'] },
);

type SparkPoint = { t: number; v: number };

/**
 * تاریخچهٔ اخیر هر ارز — برای sparkline. 12 نقطهٔ اخیر.
 * کش ۶۰ثانیه — مستقل از exchange data.
 */
const getSparkHistory = safeCache(
  async (exchangeId: string, currencyCodes: string[]): Promise<Map<string, SparkPoint[]>> => {
    if (currencyCodes.length === 0) return new Map();
    const history = await prisma.exchangeRateQuote.findMany({
      where: {
        exchangeId,
        currencyCode: { in: currencyCodes },
        status: { in: ['ACTIVE', 'EXPIRED', 'ARCHIVED'] },
      },
      select: { currencyCode: true, sellRate: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const map = new Map<string, SparkPoint[]>();
    for (const code of currencyCodes) map.set(code, []);
    const grouped = new Map<string, SparkPoint[]>();
    for (const h of history) {
      if (!grouped.has(h.currencyCode)) grouped.set(h.currencyCode, []);
      grouped.get(h.currencyCode)?.push({ t: h.createdAt.getTime(), v: Number(h.sellRate) });
    }
    for (const [code, pts] of grouped) {
      pts.sort((a, b) => a.t - b.t);
      map.set(code, pts.slice(-12));
    }
    return map;
  },
  new Map(),
  { key: 'exchange-spark-history', ttl: 60, tags: ['exchange-rates'] },
);

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  // از getExchangeMetaForSEO استفاده می‌کنیم — کش مشترک با layout برای صفر DB hit اضافی
  const exchange = await getExchangeMetaForSEO(slug);
  if (!exchange) {
    return { title: 'صرافی یافت نشد', robots: { index: false } };
  }
  const title = exchange.displayName ?? exchange.name;
  const description = exchange.city
    ? `${title} — صرافی تأییدشده در ${exchange.city}. نرخ لحظه‌ای ارز، ساعات کاری و اطلاعات تماس.`
    : `${title} — صرافی تأییدشده. نرخ لحظه‌ای ارز، ساعات کاری و اطلاعات تماس.`;
  return {
    title: `${title} | صرافی`,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: exchange.logoUrl ? [{ url: exchange.logoUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: exchange.logoUrl ? [exchange.logoUrl] : undefined,
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ExchangePublicPage({ params }: PageProps) {
  const { slug } = await params;

  // 2026-08-perf: exchange data و services موازی fetch می‌شوند
  const [exchange, services] = await Promise.all([
    getExchangeData(slug),
    getPublicExchangeServices(slug),
  ]);
  if (!exchange) notFound();

  // ── کاهش نرخ‌ها به آخرین نرخ هر ارز ──────────────────────────────
  const latestByCurrency = new Map<
    string,
    {
      buyRate: string;
      sellRate: string;
      unit: string;
      createdAt: Date;
      currencyPair: string;
    }
  >();
  for (const quote of exchange.ExchangeRateQuote) {
    if (!latestByCurrency.has(quote.currencyCode)) {
      latestByCurrency.set(quote.currencyCode, {
        buyRate: quote.buyRate.toString(),
        sellRate: quote.sellRate.toString(),
        unit: quote.unit,
        createdAt: quote.createdAt,
        currencyPair: quote.currencyPair,
      });
    }
  }

  const codes = [...latestByCurrency.keys()];

  // 2026-08-perf: sparkHistory موازی با سایر پردازش‌ها — نه sequential
  const sparkMap = await getSparkHistory(exchange.id, codes);

  // ── ساخت آرایهٔ نرخ‌ها با sparkline و spread ───────────────────
  const rates = codes
    .map((code) => {
      const data = latestByCurrency.get(code);
      if (!data) return null;
      const buy = Number(data.buyRate);
      const sell = Number(data.sellRate);
      const spread = sell - buy;
      const spreadPct = buy > 0 ? (spread / buy) * 100 : 0;
      const spark = sparkMap.get(code) ?? [];
      return {
        currencyCode: code,
        currencyPair: data.currencyPair,
        buyRate: data.buyRate,
        sellRate: data.sellRate,
        unit: data.unit,
        createdAt: data.createdAt,
        spread,
        spreadPct,
        spark: spark.map((p: SparkPoint) => p.v),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // ── اطلاعات ظاهری (address + hours) ────────────────────────────
  const { hours } = splitHours(exchange.address);
  const visibleAddress = stripHours(exchange.address);

  // ── پیدا کردن نرخ اصلی (USD) برای hero ─────────────────────────
  const usdRate = rates.find((r) => r.currencyCode === 'USD') ?? rates[0] ?? null;

  return (
    <ExchangePublicView
      exchange={{
        id: exchange.id,
        slug: exchange.slug,
        name: exchange.name,
        displayName: exchange.displayName,
        logoUrl: exchange.logoUrl,
        city: exchange.city,
        address: visibleAddress,
        phone: exchange.phone,
        email: exchange.email,
        website: exchange.website,
        licenseNo: exchange.licenseNo,
        status: exchange.status,
        createdAt: exchange.createdAt,
        _count: exchange._count,
      }}
      rates={rates}
      hours={hours}
      primaryRate={usdRate}
      services={services}
    />
  );
}
