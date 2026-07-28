/**
 * /customer/requests/new — فرم یکپارچهٔ درخواست‌های مشتری به صرافی
 *
 * ---------------------------------------------------------------------------
 * این صفحه جایگزین redirect های semantically-غلط قبلی شده (مثلاً لینک
 * «درخواست حساب جدید» که قبلاً به /customer/notifications می‌رفت).
 *
 * جریان (معماری ۲۰۲۶-۰۷-۲۸):
 *   1. کاربر از AccountsContent یا quick action وارد می‌شود با ?type=ACCOUNT_NEW
 *      یا ?type=TRANSFER_INITIATE یا ...
 *   2. فرم را پر می‌کند (نوع + payload داینامیک + توضیح)
 *   3. submit → server action `createCustomerRequest`:
 *      - یک CustomerRequest ثبت می‌کند (source-of-truth، trackingCode یکتا)
 *      - یک StatusLog اولیه اضافه می‌کند
 *      - یک notification تأییدیه cross-link می‌سازد (best of both)
 *   4. کاربر به /customer/requests/[id] (جزئیات) redirect می‌شود
 *      - لیست درخواست‌ها در /customer/requests است
 *      - notification تأییدیه در inbox باقی می‌ماند
 */

import { getCustomerAccountsDetail, getCustomerProfile, type CustomerRequestType } from '@/actions/customer-portal';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import RequestForm from './_components/RequestForm';

export const metadata: Metadata = {
  title: 'درخواست جدید',
  description: 'ارسال درخواست به صرافی: باز کردن حساب، شروع انتقال، رفع مسدودی و غیره',
};

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set([
  'ACCOUNT_NEW',
  'ACCOUNT_UNFREEZE',
  'TRANSFER_INITIATE',
  'LIMIT_INCREASE',
  'OTHER',
]);

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: typeParam } = await searchParams;
  const type = (
    typeParam && ALLOWED_TYPES.has(typeParam) ? typeParam : 'OTHER'
  ) as CustomerRequestType;

  const [profile, accounts] = await Promise.all([
    getCustomerProfile(),
    getCustomerAccountsDetail(),
  ]);

  if (!profile) redirect('/customer/dashboard');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="درخواست جدید"
        description="درخواست خود را برای صرافی ثبت کنید. پس از ثبت، در لیست درخواست‌ها قابل پیگیری است"
        breadcrumb={[
          { label: 'پورتال مشتری', href: '/customer/dashboard' },
          { label: 'درخواست‌های من', href: '/customer/requests' },
          { label: 'جدید' },
        ]}
        icon="sparkles"
        accent="violet"
      />
      <RequestForm initialType={type} accounts={accounts} profileStatus={profile.status} />
    </div>
  );
}
