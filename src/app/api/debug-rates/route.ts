/**
 * DEBUG ONLY — حذف شود بعد از تشخیص مشکل
 * GET /api/debug-rates
 * نرخ‌های خام DB را نشان می‌دهد تا unit و مقادیر AFN بررسی شوند
 */
import prisma from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const quotes = await prisma.exchangeRateQuote.findMany({
    where: { status: 'ACTIVE' },
    select: {
      currencyCode: true,
      buyRate: true,
      sellRate: true,
      unit: true,
      Exchange: { select: { name: true } },
    },
    orderBy: { currencyCode: 'asc' },
    take: 60,
  });

  const grouped: Record<string, { unit: string; buy: number; sell: number; exchange: string }[]> =
    {};

  for (const q of quotes) {
    if (!grouped[q.currencyCode]) grouped[q.currencyCode] = [];
    grouped[q.currencyCode]!.push({
      unit: q.unit,
      buy: Number(q.buyRate),
      sell: Number(q.sellRate),
      exchange: q.Exchange?.name ?? '?',
    });
  }

  return NextResponse.json(grouped, { status: 200 });
}
