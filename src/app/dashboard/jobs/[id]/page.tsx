import { auth } from '@/auth';
import { getJobById } from '@/lib/jobs';
import { redirect } from 'next/navigation';
import s from '../jobs.module.css';
import { JobInspector } from './_components/JobInspector';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'جزئیات Job | مرکز Job' };

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth?callbackUrl=/dashboard/jobs/${id}`);
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/forbidden');
  }

  const result = await getJobById(id);

  if (!result.success || !result.data) {
    return (
      <div dir="rtl" className={s.detailPage}>
        <div className={s.detailEmpty}>
          <span className={s.detailEmptyEyebrow}>Job یافت نشد</span>
          <h1 className={s.detailEmptyTitle}>{result.message ?? 'job نامعتبر است'}</h1>
          <p className={s.detailEmptyLead}>
            این job ممکن است حذف شده باشد یا شناسه‌ی آن اشتباه باشد.
          </p>
          <a href="/dashboard/jobs" className={s.detailEmptyLink}>
            بازگشت به مرکز Job
          </a>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className={s.detailPage}>
      <JobInspector job={result.data} />
    </div>
  );
}
