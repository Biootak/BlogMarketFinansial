import { auth } from '@/auth';
import { getJobSnapshot } from '@/lib/jobs';
import { redirect } from 'next/navigation';
import { DLQView } from './_components/DLQView';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'صف مرده | مرکز Job' };

export default async function DLQPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/dashboard/jobs/dlq');
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/dashboard?error=forbidden');
  }

  const result = await getJobSnapshot();
  const data = result.success ? result.data : null;

  const allJobs = (data?.jobs ?? []).filter((j) => j.status === 'dead' || j.status === 'failed');
  const deadCount = (data?.jobs ?? []).filter((j) => j.status === 'dead').length;
  const failedCount = data?.metrics.failed24h ?? 0;
  const totalJobs = data?.jobs.length ?? 0;
  const completed24h = data?.metrics.completed24h ?? 0;

  return (
    <DLQView
      jobs={allJobs}
      deadCount={deadCount}
      failedCount={failedCount}
      totalJobs={totalJobs}
      completed24h={completed24h}
    />
  );
}
