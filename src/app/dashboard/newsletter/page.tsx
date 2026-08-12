import { getNewsletterSubscribers } from '@/actions/newsletter-actions';
import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import NewsletterClient from './_components/NewsletterClient';

export const metadata: Metadata = {
  title: 'خبرنامه | داشبورد',
  description: 'مدیریت مشترکین خبرنامه و ارسال خبرنامه',
};

export default async function NewsletterPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth?callbackUrl=/dashboard/newsletter');
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) redirect('/forbidden');

  const result = await getNewsletterSubscribers();

  return (
    <div className="route-frame" dir="rtl">
      <NewsletterClient initial={result.success ? (result.data ?? null) : null} />
    </div>
  );
}
