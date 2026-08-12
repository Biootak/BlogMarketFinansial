import { getFeedbackSubmissions } from '@/actions/feedback-actions';
import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import FeedbackClient from './_components/FeedbackClient';

export const metadata: Metadata = {
  title: 'بازخوردها | داشبورد',
  description: 'پیام‌های بازخورد و تماس کاربران',
};

export default async function FeedbackPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth?callbackUrl=/dashboard/feedback');
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN', 'SUPPORT'].includes(role)) redirect('/forbidden');

  const result = await getFeedbackSubmissions({ limit: 200 });

  return (
    <div className="route-frame" dir="rtl">
      <FeedbackClient initial={result.success ? (result.data ?? null) : null} />
    </div>
  );
}
