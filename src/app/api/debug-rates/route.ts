import { auth } from '@/auth';
import prisma from '@/lib/db';
import { NextResponse } from 'next/server';

/** Internal diagnostics only. Never expose raw exchange quotes publicly. */
export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !['ADMIN', 'OWNER', 'SUPERADMIN'].includes(role ?? '')) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

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
    grouped[q.currencyCode]?.push({
      unit: q.unit,
      buy: Number(q.buyRate),
      sell: Number(q.sellRate),
      exchange: q.Exchange?.name ?? '?',
    });
  }

  return NextResponse.json(grouped, {
    status: 200,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
