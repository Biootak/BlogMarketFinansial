/**
 * /exchange/quotes — ثبت و مدیریت قیمت‌های خرید/فروش صرافی
 *
 * صراف برای هر ارز قیمت خرید و فروش خودش را ثبت می‌کند.
 * پس از تایید ادمین، قیمت‌ها در سایت نمایش داده می‌شوند.
 */

import { getExchangeForUser } from '@/actions/exchanges';
import { getExchangeQuotes } from '@/actions/exchange-quotes';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import QuotesWorkspace from './_components/QuotesWorkspace';

export const metadata: Metadata = { title: 'قیمت‌گذاری ارز' };

export default async function ExchangeQuotesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const membership = await getExchangeForUser(session.user.id);
  if (!membership) redirect('/dashboard');

  const { exchange } = membership;
  const quotes = await getExchangeQuotes(exchange.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="قیمت‌گذاری ارز"
        description="برای هر ارز قیمت خرید و فروش خود را ثبت کنید. پس از تایید ادمین در سایت نمایش داده می‌شود."
        breadcrumb={[{ label: 'پنل صرافی' }, { label: 'قیمت‌گذاری' }]}
      />
      <QuotesWorkspace
        exchangeId={exchange.id}
        allowedCurrencies={(exchange as { allowedCurrencies?: string[] }).allowedCurrencies ?? []}
        initialQuotes={quotes}
      />
    </div>
  );
}
