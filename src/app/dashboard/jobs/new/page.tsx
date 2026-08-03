import { auth } from '@/auth';
import { getRecentJobTypes } from '@/lib/jobs';
import { redirect } from 'next/navigation';
import s from '../jobs.module.css';
import { EnqueueJobForm } from './_components/EnqueueJobForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'ساخت Job جدید | مرکز Job' };

const QUEUE_PRESETS = ['default', 'email', 'sms', 'market-rates', 'settlement', 'kyc', 'cron'];

export default async function NewJobPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/dashboard/jobs/new');
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/dashboard?error=forbidden');
  }

  const typesRes = await getRecentJobTypes();
  const recentTypes = (typesRes.data ?? []).slice(0, 12).map((t) => t.type);

  return (
    <div dir="rtl" className={s.newPage}>
      <EnqueueJobForm queues={QUEUE_PRESETS} recentTypes={recentTypes} />
    </div>
  );
}
