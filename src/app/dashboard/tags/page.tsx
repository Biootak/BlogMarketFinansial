import { getTags } from '@/actions/tag-actions';
import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import TagsClient from './_components/TagsClient';

export const metadata: Metadata = {
  title: 'مدیریت برچسب‌ها | داشبورد',
  description: 'ساخت، ویرایش و حذف برچسب‌های مقالات',
};

export default async function TagsPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth?callbackUrl=/dashboard/tags');
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN', 'AUTHOR'].includes(role)) redirect('/forbidden');

  const result = await getTags();

  return (
    <div className="route-frame" dir="rtl">
      <TagsClient initial={result.success ? (result.data ?? null) : null} />
    </div>
  );
}
