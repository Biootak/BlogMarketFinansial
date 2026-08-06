import { getPendingQuotes } from '@/actions/exchange-quotes';
import { requireAdmin } from '@/lib/require-auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ExchangeQuotesApprovalWorkspace from './_components/ExchangeQuotesApprovalWorkspace';

export const metadata: Metadata = { title: 'تایید قیمت‌گذاری صرافی‌ها' };
export const dynamic = 'force-dynamic';

/**
 * سربرگ این مسیر عمداً اینجا نیست.
 * `ExchangeQuotesApprovalWorkspace` مالک سربرگ است (اکشن‌ها و شمارندهٔ صف
 * کلاینتی‌اند). قبلاً هر دو لایه سربرگ می‌زدند.
 * قرارداد در `primitives/pageHeaders.ts` → owner: 'client'.
 */
export default async function ExchangeQuotesPage() {
  const auth = await requireAdmin();
  if (!auth.success) redirect('/dashboard');

  const pending = await getPendingQuotes();

  return (
    <main className="max-w-[1440px] mx-auto">
      <ExchangeQuotesApprovalWorkspace initialPending={pending} />
    </main>
  );
}
