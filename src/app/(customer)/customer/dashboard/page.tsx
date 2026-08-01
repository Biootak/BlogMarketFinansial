/**
 * /customer/dashboard — داشبورد مشتری
 *
 * نمایش موجودی حساب‌ها، آخرین تراکنش‌ها و وضعیت KYC
 */
import { getCustomerDashboardData } from '@/actions/customer-portal';
import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CustomerDashboardContent from './_components/CustomerDashboardContent';

export const metadata: Metadata = {
  title: 'داشبورد مشتری',
  description: 'مدیریت حساب و تراکنش‌های ارزی',
};

export const dynamic = 'force-dynamic';

export default async function CustomerDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/customer/dashboard');

  const data = await getCustomerDashboardData();
  if (!data) redirect('/auth?callbackUrl=/customer/dashboard');

  return <CustomerDashboardContent data={data} />;
}
