import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const maxDuration = 15;

const TrackBodySchema = z.object({
  trackingCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{8,20}$/, 'کد پیگیری نامعتبر است'),
});

/**
 * POST /api/deal/track
 * Public: track a CurrencyDeal by trackingCode.
 * Rate limit: 20/min per IP.
 * No sensitive fields exposed (userId, customerPhone, internalNote, idempotencyKey).
 */
export async function POST(request: Request) {
  // Rightmost XFF entry is the one appended by our trusted proxy — spoof-resistant.
  const xff = request.headers.get('x-forwarded-for');
  const ip =
    (xff
      ? xff
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
          .at(-1)
      : null) ??
    request.headers.get('x-real-ip')?.trim() ??
    '127.0.0.1';

  const rl = await checkRateLimit(`deal-track:${ip}`, 'api');
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
        headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store, private' },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_JSON', message: 'درخواست نامعتبر است' } },
      { status: 400, headers: { 'Cache-Control': 'no-store, private' } },
    );
  }

  const parsed = TrackBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0]?.message ?? 'کد نامعتبر است',
        },
      },
      { status: 422, headers: { 'Cache-Control': 'no-store, private' } },
    );
  }

  const { trackingCode } = parsed.data;

  const deal = await prisma.currencyDeal.findUnique({
    where: { trackingCode },
    include: {
      Exchange: { select: { name: true, displayName: true, city: true } },
      StatusLogs: { orderBy: { createdAt: 'asc' }, take: 20 },
    },
  });

  if (!deal) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'معامله با این کد پیگیری یافت نشد',
        },
      },
      { status: 404, headers: { 'Cache-Control': 'no-store, private' } },
    );
  }

  // Ensure Exchange exists before accessing its properties
  if (!deal.Exchange) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATA_ERROR',
          message: 'اطلاعات صرافی یافت نشد',
        },
      },
      { status: 500, headers: { 'Cache-Control': 'no-store, private' } },
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        trackingCode: deal.trackingCode,
        exchangeName: deal.Exchange.displayName ?? deal.Exchange.name,
        exchangeCity: deal.Exchange.city ?? null,
        fromCurrency: deal.fromCurrency,
        toCurrency: deal.toCurrency,
        fromAmount: deal.fromAmount.toString(),
        toAmount: deal.toAmount.toString(),
        appliedRate: deal.appliedRate.toString(),
        status: deal.status,
        channel: deal.channel,
        createdAt: deal.createdAt.toISOString(),
        confirmedAt: deal.confirmedAt?.toISOString() ?? null,
        completedAt: deal.completedAt?.toISOString() ?? null,
        statusLogs: (deal.StatusLogs || []).map((l) => ({
          toStatus: l.toStatus,
          note: l.note ?? null,
          createdAt: l.createdAt.toISOString(),
        })),
      },
    },
    { headers: { 'Cache-Control': 'no-store, private' } },
  );
}
