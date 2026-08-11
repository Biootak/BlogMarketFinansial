/**
 * /exchange/quotes — ثبت و مدیریت قیمت‌های خرید/فروش صرافی
 *
 * صراف برای هر ارز قیمت خرید و فروش خودش را ثبت می‌کند.
 * پس از تایید ادمین، قیمت‌ها در سایت نمایش داده می‌شوند.
 *
 * v2 (2026-08-01): بازطراحی کامل — «کابین مالی صراف».
 *   - سربرگ منفرد با سه متریک snapshot (در انتظار / فعال / منقضی)
 *   - مجموعه یکپارچه quote (کارت‌ها + جدول قابل مرتب‌سازی)
 *   - تاریخچه نرخ با Sparkline بومی (بدون chart-lib)
 *   - فقط داده واقعی DB — هیچ mock/نمایشی
 */

import { getExchangeQuotes } from '@/actions/exchange-quotes';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import { TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import QuotesWorkspace from './_components/QuotesWorkspace';

export const metadata: Metadata = { title: 'قیمت‌گذاری ارز' };

export default async function ExchangeQuotesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/quotes');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/forbidden');

  const { exchange } = membership;
  const quotes = await getExchangeQuotes(exchange.id);

  const pendingCount = quotes.filter((q) => q.status === 'PENDING').length;
  const activeCount = quotes.filter((q) => q.status === 'ACTIVE').length;
  const expiredCount = quotes.filter((q) => q.status === 'EXPIRED').length;

  const headerMeta = [
    { label: 'در انتظار', value: pendingCount },
    { label: 'فعال در سایت', value: activeCount },
    { label: 'منقضی', value: expiredCount },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="قیمت‌گذاری ارز"
        description="برای هر ارز قیمت خرید و فروش خود را ثبت کنید. پس از تایید ادمین در سایت نمایش داده می‌شود."
        breadcrumb={[{ label: 'پنل صرافی' }, { label: 'قیمت‌گذاری' }]}
        eyebrow="کابین نرخ صراف"
        icon="circle-dollar-sign"
        accent="emerald"
        actions={
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--ds-space-2)',
              padding: '6px 12px',
              borderRadius: 'var(--at-radius)',
              background: 'var(--at-accent-soft)',
              color: 'var(--at-accent-fg)',
              fontSize: 'var(--ds-text-xs)',
              fontWeight: 600,
            }}
          >
            <TrendingUp size={14} aria-hidden />
            نرخ‌های سایت در لحظه
          </div>
        }
        meta={headerMeta}
      />
      <QuotesWorkspace
        exchangeId={exchange.id}
        allowedCurrencies={(exchange as { allowedCurrencies?: string[] }).allowedCurrencies ?? []}
        initialQuotes={quotes}
      />
    </div>
  );
}
