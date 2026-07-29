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
import s from './apply-exchange.module.css';

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
    <main dir="rtl" className={s.root}>
      <ApplyExchangeForm />
    </main>
  );
}
