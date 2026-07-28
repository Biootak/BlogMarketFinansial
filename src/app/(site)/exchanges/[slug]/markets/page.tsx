/**
 * /exchanges/[slug]/markets — جدول کامل بازارها
 *
 *   نمایش تک‌ستونی/جدولی همهٔ ارزهای فعال صرافی.
 *   sub-route از layout ارث می‌برد (SubNav + theme).
 */

import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { stripHours } from '@/lib/exchange-hours';

import type { Metadata } from 'next';
import MarketsView from './_components/MarketsView';

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ex = await prisma.exchange.findUnique({
    where: { slug },
    select: { name: true, displayName: true },
  });
  if (!ex) return { title: 'صرافی یافت نشد' };
  return {
    title: `بازارهای ${ex.displayName ?? ex.name} | صرافی`,
    description: `جدول کامل نرخ خرید و فروش ارزها در ${ex.displayName ?? ex.name}.`,
  };
}

async function getData(slug: string) {
  const ex = await prisma.exchange.findUnique({
    where: { slug },
    include: {
      ExchangeRateQuote: {
        where: { status: 'ACTIVE' },
        orderBy: [{ currencyCode: 'asc' }, { createdAt: 'desc' }],
        take: 100,
      },
    },
  });
  if (!ex || ex.status !== 'ACTIVE') return null;
  return ex;
}

async function getSparkHistory(exchangeId: string, codes: string[]) {
  if (codes.length === 0) return new Map<string, number[]>();
  const history = await prisma.exchangeRateQuote.findMany({
    where: {
      exchangeId,
      currencyCode: { in: codes },
    },
    select: { currencyCode: true, sellRate: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });
  const grouped = new Map<string, { t: number; v: number }[]>();
  for (const h of history) {
    if (!grouped.has(h.currencyCode)) grouped.set(h.currencyCode, []);
    grouped.get(h.currencyCode)?.push({ t: h.createdAt.getTime(), v: Number(h.sellRate) });
  }
  const out = new Map<string, number[]>();
  for (const [code, pts] of grouped) {
    pts.sort((a, b) => a.t - b.t);
    out.set(code, pts.slice(-24).map((p) => p.v));
  }
  return out;
}

export default async function MarketsPage({ params }: Props) {
  const { slug } = await params;
  const ex = await getData(slug);
  if (!ex) notFound();

  const visibleAddress = stripHours(ex.address);

  const latest = new Map<
    string,
    { buyRate: string; sellRate: string; unit: string; createdAt: Date; pair: string }
  >();
  for (const q of ex.ExchangeRateQuote) {
    if (!latest.has(q.currencyCode)) {
      latest.set(q.currencyCode, {
        buyRate: q.buyRate.toString(),
        sellRate: q.sellRate.toString(),
        unit: q.unit,
        createdAt: q.createdAt,
        pair: q.currencyPair,
      });
    }
  }
  const codes = [...latest.keys()];
  const sparkMap = await getSparkHistory(ex.id, codes);

  const rates = codes.map((code) => {
    const d = latest.get(code);
    if (!d) return null;
    const buy = Number(d.buyRate);
    const sell = Number(d.sellRate);
    return {
      currencyCode: code,
      currencyPair: d.pair,
      buyRate: d.buyRate,
      sellRate: d.sellRate,
      unit: d.unit,
      createdAt: d.createdAt,
      spread: sell - buy,
      spreadPct: buy > 0 ? ((sell - buy) / buy) * 100 : 0,
      spark: sparkMap.get(code) ?? [],
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <MarketsView
      exchange={{
        name: ex.displayName ?? ex.name,
        city: ex.city,
        address: visibleAddress,
      }}
      rates={rates}
    />
  );
}
