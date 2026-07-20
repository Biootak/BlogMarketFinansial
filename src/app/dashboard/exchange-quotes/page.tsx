/**
 * /dashboard/exchange-quotes — صف تایید قیمت‌گذاری صرافی‌ها
 * ادمین از اینجا quote های PENDING را تایید یا رد می‌کند.
 */
import { getPendingQuotes } from '@/actions/exchange-quotes';
import { requireAdmin } from '@/lib/require-auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ExchangeQuotesApprovalWorkspace from './_components/ExchangeQuotesApprovalWorkspace';

export const metadata: Metadata = { title: 'تایید قیمت‌گذاری صرافی‌ها' };

export default async function ExchangeQuotesPage() {
  const auth = await requireAdmin();
  if (!auth.success) redirect('/dashboard');

  const pending = await getPendingQuotes();

  return <ExchangeQuotesApprovalWorkspace initialPending={pending} />;
}
