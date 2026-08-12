import { getCustomerStats, getCustomers } from '@/actions/exchange-customers';
import { getAllExchanges } from '@/actions/exchanges';
import { requireAdmin } from '@/lib/require-auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CustomersClient from './_components/CustomersClient';

export const metadata: Metadata = {
  title: 'مشتریان | داشبورد',
  description: 'مدیریت مشتریان صرافی‌ها — KYC، تراکنش، وضعیت',
};

interface Props {
  searchParams: Promise<{
    q?: string;
    status?: string;
    exchange?: string;
    page?: string;
  }>;
}

export default async function CustomersPage({ searchParams }: Props) {
  const auth = await requireAdmin();
  if (!auth.success) redirect('/dashboard');

  const sp = await searchParams;
  const query = sp.q ?? '';
  const status = sp.status ?? 'all';
  const page = Math.max(1, Number(sp.page ?? 1));
  const limit = 20;

  // لیست همه صرافی‌ها برای فیلتر
  const exchanges = await getAllExchanges();

  // اعتبارسنجی exchangeId از URL: اگر صرافی حذف/غیرفعال شده، به صرافی معتبر اول برگردان.
  // اگر صرافی‌ای وجود نداشته، همان پیام «هنوز صرافی ندارید» نمایش داده می‌شود.
  const requestedId = sp.exchange ?? '';
  const requestedExists = requestedId && exchanges.some((e) => e.id === requestedId);
  const targetExchangeId = requestedExists ? requestedId : (exchanges[0]?.id ?? '');

  // اگر URL صرافی نامعتبر داشت ولی صرافی معتبر موجود است، URL را پاک کن تا انتخاب کاربر شفاف شود.
  if (requestedId && !requestedExists && targetExchangeId) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (status !== 'all') params.set('status', status);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    redirect(`/dashboard/customers${qs ? `?${qs}` : ''}`);
  }

  let customersData = { rows: [], total: 0 } as Awaited<ReturnType<typeof getCustomers>>;
  // آمار کل مشتریان صرافی — برای KPIها (نه فقط صفحهٔ فعلی)
  let stats = (await getCustomerStats(targetExchangeId)) as Awaited<
    ReturnType<typeof getCustomerStats>
  >;
  if (targetExchangeId) {
    [customersData, stats] = await Promise.all([
      getCustomers(targetExchangeId, {
        query,
        status: status !== 'all' ? status : undefined,
        limit,
        offset: (page - 1) * limit,
      }),
      getCustomerStats(targetExchangeId),
    ]);
  }

  return (
    <div className="route-frame" dir="rtl">
      <CustomersClient
        customers={customersData.rows}
        total={customersData.total}
        exchanges={exchanges}
        currentExchangeId={targetExchangeId}
        currentQuery={query}
        currentStatus={status}
        currentPage={page}
        pageSize={limit}
        currentUserRole={auth.user.role}
        customerStats={stats}
      />
    </div>
  );
}
