import { getComments } from '@/actions/comments-actions';
import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CommentsClient from './_components/CommentsClient';

export const metadata: Metadata = {
  title: 'مدیریت نظرات | داشبورد',
  description: 'تأیید، رد و مدیریت نظرات مقالات',
};

export default async function CommentsPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth?callbackUrl=/dashboard/comments');
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN', 'AUTHOR'].includes(role)) redirect('/forbidden');

  const result = await getComments({ limit: 40, status: 'pending' });

  return (
    <div className="route-frame" dir="rtl">
      <CommentsClient initial={result.success ? (result.data ?? null) : null} />
    </div>
  );
}
