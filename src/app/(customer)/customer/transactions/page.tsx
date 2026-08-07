/**
 * /customer/transactions — تاریخچه تراکنش‌های مشتری
 */
import { getCustomerTransactions } from '@/actions/customer-portal';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import TransactionsContent from './_components/TransactionsContent';

const _faNum = new Intl.NumberFormat('fa-IR');

export const metadata: Metadata = {
  title: 'تراکنش‌های من',
  description: 'تاریخچه کامل تراکنش‌های ارزی',
};

export const dynamic = 'force-dynamic';

export default async function CustomerTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; kind?: string; status?: string; accountId?: string }>;
}) {
  // auth() حذف شد — layout.tsx احراز هویت را انجام داده است.
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const kind = sp.kind ?? '';
  const status = sp.status ?? '';
  // M7-fix: از تاریخچهٔ دارایی رمزارز ?accountId= می‌آید — فقط آن حساب را نشان بده
  const accountId = sp.accountId ?? '';

  const result = await getCustomerTransactions({
    page,
    limit: 20,
    kind: kind || undefined,
    status: status || undefined,
    accountId: accountId || undefined,
  });

  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-6)',
        maxInlineSize: '960px',
        marginInline: 'auto',
        inlineSize: '100%',
      }}
    >
      <PageHeader
        title="تراکنش‌ها"
        description={`مجموع ${_faNum.format(result.total)} تراکنش${accountId ? ' — فیلتر حساب' : ''}`}
        breadcrumb={[{ label: 'پورتال مشتری' }, { label: 'تراکنش‌ها' }]}
        icon="arrow-left-right"
      />
      <TransactionsContent
        initialRows={result.rows}
        total={result.total}
        page={page}
        hasMore={result.hasMore}
        filterKind={kind}
        filterStatus={status}
      />
    </div>
  );
}
