/**
 * /exchange — ریدایرکت هوشمند به پنل صرافی
 */

import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ExchangeIndex() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/exchange/dashboard');
  }
  const membership = await getExchangeForUser();
  // 2026-08-10: لاگین‌شده بدون عضویت → /forbidden (نه /auth — حلقهٔ بی‌پایان)
  if (!membership) {
    redirect('/forbidden');
  }
  redirect('/exchange/dashboard');
}
