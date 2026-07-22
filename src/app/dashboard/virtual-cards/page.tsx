import { getMyVirtualCards } from '@/actions/virtual-card';
import { requireUser } from '@/lib/require-auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import VirtualCardsClient from './_components/VirtualCardsClient';

export const metadata: Metadata = {
  title: 'کارت‌های مجازی | داشبورد',
  description: 'مدیریت کارت‌های مجازی پیش‌پرداخت شما',
};

export default async function VirtualCardsPage() {
  const auth = await requireUser();
  if (!auth.success) redirect('/signin?callbackUrl=/dashboard/virtual-cards');

  const cards = await getMyVirtualCards();

  return (
    <div className="at-page" dir="rtl">
      <VirtualCardsClient initialCards={cards} />
    </div>
  );
}
