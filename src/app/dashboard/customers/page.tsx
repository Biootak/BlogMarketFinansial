import { getCustomers } from '@/actions/exchange-customers';
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
  const exchangeId = sp.exchange ?? '';
  const page = Math.max(1, Number(sp.page ?? 1));
  const limit = 20;

  // لیست همه صرافی‌ها برای فیلتر
  const exchanges = await getAllExchanges();

  // برای admin: اولین صرافی را پیش‌فرض بگیر (یا فیلتر شده)
  const targetExchangeId = exchangeId || exchanges[0]?.id || '';

  let customersData = { rows: [], total: 0 } as Awaited<ReturnType<typeof getCustomers>>;
  if (targetExchangeId) {
    customersData = await getCustomers(targetExchangeId, {
      query,
      status: status !== 'all' ? status : undefined,
      limit,
      offset: (page - 1) * limit,
    });
  }

  return (
    <div className="at-page" dir="rtl">
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
      />
    </div>
  );
}
