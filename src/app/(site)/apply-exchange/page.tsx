/**
 * /apply-exchange — فرم درخواست ثبت صرافی
 *
 * R15-fix (2026-07): هر کاربر لاگین‌شده می‌تواند برای ثبت صرافی در پلتفرم
 * درخواست بدهد. درخواست با status=PENDING ذخیره می‌شود و باید توسط
 * مدیران پلتفرم تأیید شود.
 */

import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ApplyExchangeForm from './_components/ApplyExchangeForm';

export const metadata: Metadata = {
  title: 'ثبت‌نام صرافی | پلتفرم انتقال ارز',
  description: 'برای ثبت صرافی خود در پلتفرم درخواست دهید',
};

export default async function ApplyExchangePage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/auth?callbackUrl=/apply-exchange');
  }

  return (
    <main dir="rtl" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--ds-space-6)' }}>
      <ApplyExchangeForm />
    </main>
  );
}
