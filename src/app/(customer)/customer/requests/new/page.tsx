/**
 * /customer/requests/new — فرم یکپارچهٔ درخواست‌های مشتری به صرافی
 *
 * ---------------------------------------------------------------------------
 * این صفحه جایگزین redirect های semantically-غلط قبلی شده (مثلاً لینک
 * «درخواست حساب جدید» که قبلاً به /customer/notifications می‌رفت).
 *
 * جریان:
 *   1. کاربر از AccountsContent یا sidebar وارد می‌شود با ?type=ACCOUNT_NEW
 *      یا ?type=TRANSFER_INITIATE یا ...
 *   2. فرم را پر می‌کند (نوع + payload داینامیک + توضیح)
 *   3. submit → server action `createCustomerRequest` یک notification ثبت
 *      می‌کند (با prefix ساختاریافته `[REQUEST:TYPE]`)
 *   4. کاربر به /customer/notifications redirect می‌شود و تأییدیه را
 *      در inbox می‌بیند (پیام READ نیست تا متوجه شود)
 *
 * نکته: به جای migration DB و ساخت جدول جدید، از همین Notification
 * model استفاده می‌کنیم. prefix `[REQUEST:TYPE]` هم برای UI قابل parse
 * است و هم برای صرافی در inbox خودش.
 */

import { getCustomerAccounts, getCustomerProfile } from '@/actions/customer-portal';
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
  const type = typeParam && ALLOWED_TYPES.has(typeParam) ? typeParam : 'OTHER';

  const [profile, accounts] = await Promise.all([
    getCustomerProfile(),
    getCustomerAccounts(),
  ]);

  if (!profile) redirect('/customer');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="درخواست جدید"
        description="درخواست خود را برای صرافی ثبت کنید. پس از تأیید، پیامی در inbox شما قرار می‌گیرد"
        breadcrumb={[
          { label: 'پورتال مشتری', href: '/customer' },
          { label: 'پیام‌ها', href: '/customer/notifications' },
          { label: 'درخواست جدید' },
        ]}
        icon="send"
      />
      <RequestForm initialType={type} accounts={accounts} profileStatus={profile.status} />
    </div>
  );
}
