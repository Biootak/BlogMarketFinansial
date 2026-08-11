import { getPendingQuotes } from '@/actions/exchange-quotes';
import { requireAdmin } from '@/lib/require-auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ExchangeQuotesApprovalWorkspace from './_components/ExchangeQuotesApprovalWorkspace';

export const metadata: Metadata = {
  title: 'تأیید قیمت‌گذاری صرافی‌ها | داشبورد',
  description: 'قیمت‌های خرید/فروش ثبت‌شده توسط صرافی‌ها را بررسی و تأیید یا رد کنید.',
};
export const dynamic = 'force-dynamic';

export default async function ExchangeQuotesPage() {
  const auth = await requireAdmin();
  if (!auth.success) redirect('/dashboard');

  const pending = await getPendingQuotes();

  return (
    <div className="route-frame" dir="rtl">
      <ExchangeQuotesApprovalWorkspace initialPending={pending} />
    </div>
  );
}
