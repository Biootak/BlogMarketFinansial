/**
 * /customer/dashboard — داشبورد مشتری
 *
 * نمایش موجودی حساب‌ها، آخرین تراکنش‌ها و وضعیت KYC
 */
import { getCustomerDashboardData } from '@/actions/customer-portal';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CustomerDashboardContent from './_components/CustomerDashboardContent';

export const metadata: Metadata = {
  title: 'داشبورد مشتری',
  description: 'مدیریت حساب و تراکنش‌های ارزی',
};

export const dynamic = 'force-dynamic';

export default async function CustomerDashboardPage() {
  // auth() حذف شد — layout.tsx احراز هویت را انجام داده است.
  const data = await getCustomerDashboardData();
  // 2026-08-10: لاگین‌شده ولی بدون پروفایل/دسترسی مشتری → /forbidden
  // (نه /auth — با auto-redirect فرانت‌اند حلقهٔ بی‌پایان می‌سازد).
  if (!data) redirect('/forbidden');

  return <CustomerDashboardContent data={data} />;
}
