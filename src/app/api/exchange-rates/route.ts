import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * GET /api/exchange-rates
 * Public endpoint returning all ACTIVE ExchangeRateQuote records.
 * Rate limit: 60/min per IP.
 * Cache: public, max-age=30, stale-while-revalidate=60.
 */
export async function GET(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1';

  const rl = await checkRateLimit(`exchange-rates:${ip}`, 'api');
  if (!rl.success) {
    const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'درخواست‌های زیاد. لطفاً بعداً تلاش کنید.',
        },
      },
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          'Retry-After': String(retryAfter),
        },
      },
    );
  }

  try {
    const quotes = await prisma.exchangeRateQuote.findMany({
      where: { status: 'ACTIVE' },
      include: {
        Exchange: {
          select: {
            name: true,
            displayName: true,
            slug: true,
            city: true,
            logoUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const data = quotes.map((q) => ({
      id: q.id,
      exchangeId: q.exchangeId,
      exchangeName: q.Exchange.displayName ?? q.Exchange.name,
      exchangeSlug: q.Exchange.slug,
      exchangeCity: q.Exchange.city ?? null,
      exchangeLogoUrl: q.Exchange.logoUrl ?? null,
      currencyCode: q.currencyCode,
      currencyPair: q.currencyPair,
      buyRate: q.buyRate.toString(),
      sellRate: q.sellRate.toString(),
      unit: q.unit,
      minAmount: q.minAmount?.toString() ?? null,
      maxAmount: q.maxAmount?.toString() ?? null,
      validMinutes: q.validMinutes,
      expiresAt: q.expiresAt?.toISOString() ?? null,
      status: q.status,
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          quotes: data,
          updatedAt: new Date().toISOString(),
          total: data.length,
        },
      },
      {
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در دریافت نرخ‌ها. لطفاً دوباره تلاش کنید.' },
      },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
