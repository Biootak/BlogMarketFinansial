/**
 * /exchange — ریدایرکت هوشمند به پنل صرافی
 */

import { getExchangeForUser } from '@/actions/exchange-access';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ExchangeIndex() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/exchange/dashboard');
  }
  const membership = await getExchangeForUser();
  if (!membership) {
    redirect('/auth?callbackUrl=/exchange/dashboard&reason=exchange-not-found');
  }
  redirect('/exchange/dashboard');
}
