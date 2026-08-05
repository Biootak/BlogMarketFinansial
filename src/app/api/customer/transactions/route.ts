/**
 * GET /api/customer/transactions
 *
 * cursor-based pagination روی LedgerEntry های مشتری لاگین‌شده.
 * ?limit=20&cursor=<ledgerEntryId>
 *
 * امنیت: session + customer ownership + rate-limit
 */

import { auth } from '@/auth';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { NextResponse } from 'next/server';

export const maxDuration = 20;

const PRIVATE_HEADERS = { 'Cache-Control': 'no-store, private' };

export async function GET(request: Request) {
  // Rate limit: 60 درخواست در دقیقه بر اساس IP
  // Rightmost XFF entry (spoof-resistant) — نه leftmost که کاربر می‌تواند جعل کند.
  const xff = request.headers.get('x-forwarded-for');
  const ip =
    (xff
      ? xff
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
          .at(-1)
      : null) ?? 'unknown';
  const rl = await checkRateLimit(`customer-txn:${ip}`, 'api');
  if (!rl.success) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'تعداد درخواست‌ها زیاد است. لطفاً کمی صبر کنید.' },
      },
      { status: 429, headers: PRIVATE_HEADERS },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHENTICATED', message: 'احراز هویت لازم است' } },
      { status: 401, headers: PRIVATE_HEADERS },
    );
  }

  const url = new URL(request.url);
  const cursorParam = url.searchParams.get('cursor') ?? undefined;
  const limitRaw = Number(url.searchParams.get('limit') ?? '20');
  const limit = Math.min(50, Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 20));

  // پیدا کردن Customer record کاربر (ownership check — داده کاربر دیگر لیک نمی‌شود)
  const customer = await prisma.customer.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!customer) {
    return NextResponse.json(
      { success: true, data: { entries: [], nextCursor: null, hasMore: false } },
      { headers: PRIVATE_HEADERS },
    );
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: 'desc' },
    take: limit + 1, // یکی بیشتر برای تشخیص hasMore
    ...(cursorParam ? { cursor: { id: cursorParam }, skip: 1 } : {}),
    select: {
      id: true,
      direction: true,
      amount: true,
      currency: true,
      description: true,
      createdAt: true,
      runningBalance: true,
    },
  });

  const hasMore = entries.length > limit;
  const pageEntries = hasMore ? entries.slice(0, limit) : entries;
  const nextCursor = hasMore ? (pageEntries[pageEntries.length - 1]?.id ?? null) : null;

  return NextResponse.json(
    {
      success: true,
      data: {
        entries: pageEntries.map((e) => ({
          id: e.id,
          direction: e.direction,
          amount: e.amount.toString(),
          currency: e.currency,
          description: e.description ?? null,
          createdAt: e.createdAt.toISOString(),
          runningBalance: e.runningBalance.toString(),
        })),
        nextCursor,
        hasMore,
      },
    },
    { headers: PRIVATE_HEADERS },
  );
}
