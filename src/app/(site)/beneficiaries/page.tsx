/**
 * /beneficiaries — مدیریت دریافت‌کنندگان مکرر کاربر
 *
 * Server Component: لیست را از DB می‌گیرد.
 * مدیریت (ایجاد/ویرایش/حذف) از طریق BeneficiaryManager Client Component انجام می‌شود.
 */

import { getMyBeneficiaries } from '@/actions/beneficiaries';
import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import BeneficiaryManager from './BeneficiaryManager';

export const metadata: Metadata = {
  title: 'مخاطبان انتقال | کیف پول',
  description: 'دریافت‌کنندگان مکرر خود را ذخیره و مدیریت کنید.',
};

export default async function BeneficiariesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/beneficiaries');

  const beneficiaries = await getMyBeneficiaries();

  return <BeneficiaryManager initialBeneficiaries={beneficiaries} />;
}
