/**
 * /customer/security — مرکز امنیت حساب
 *
 * دسترسی: CUSTOMER / TEST_CUSTOMER / MERCHANT + platform admins
 * داده: getMySecurityOverview (user-level + customer-level preferences)
 *
 * 2026-07-29: این صفحه جایگزین redirect به auth flow برای تغییر رمز شد.
 * شامل: تغییر رمز، نمایش وضعیت 2FA، تعداد دستگاه‌های فعال، منطقهٔ خطر.
 */
import { getMySecurityOverview } from '@/actions/customer-portal';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SecurityCenter } from './_components/SecurityCenter';

export const metadata: Metadata = {
  title: 'امنیت حساب | پنل مشتری',
  description: 'تغییر رمز عبور، مدیریت نشست‌ها و حذف حساب',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CustomerSecurityPage() {
  // auth() حذف شد — layout.tsx احراز هویت را انجام داده است.
  const result = await getMySecurityOverview();
  if (!result.success) {
    redirect('/customer/dashboard');
  }

  return (
    <div
      dir="rtl"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}
    >
      <PageHeader
        eyebrow="امنیت"
        title="مرکز امنیت"
        description="رمز عبور، احراز هویت دو مرحله‌ای و مدیریت دستگاه‌ها"
        breadcrumb={[
          { href: '/customer/dashboard', label: 'پنل مشتری' },
          { label: 'امنیت' },
        ]}
        icon="shield-check"
        accent="emerald"
      />
      <SecurityCenter overview={result.data} />
    </div>
  );
}
