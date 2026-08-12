/**
 * GET /api/customer/wallet
 *
 * موجودی لحظه‌ای حساب‌های کیف پول مشتری لاگین‌شده — برای رفرش hero بعد از
 * واریز/برداشت/تبدیل بدون رفرش کامل صفحه.
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
  const xff = request.headers.get('x-forwarded-for');
  const ip =
    (xff
      ? xff
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
          .at(-1)
      : null) ?? 'unknown';
  const rl = await checkRateLimit(`customer-wallet:${ip}`, 'api');
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

  const customer = await prisma.customer.findFirst({
    where: { userId: session.user.id },
    select: {
      id: true,
      FintechAccount: {
        where: { status: 'ACTIVE' },
        select: { id: true, currency: true, balance: true, status: true, type: true },
      },
    },
  });

  if (!customer) {
    return NextResponse.json(
      { success: true, data: { accounts: [] } },
      { headers: PRIVATE_HEADERS },
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        accounts: customer.FintechAccount.map((a) => ({
          id: a.id,
          currency: a.currency,
          balance: a.balance.toString(),
          status: a.status,
          type: a.type,
        })),
      },
    },
    { headers: PRIVATE_HEADERS },
  );
}
