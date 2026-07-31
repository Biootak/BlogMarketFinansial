import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { QueuesView } from './_components/QueuesView';
import { getJobSnapshot, getQueueHealth, getRecentJobTypes } from '@/lib/jobs';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'صف‌ها | مرکز Job' };

export default async function QueuesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/dashboard/jobs/queues');
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/dashboard?error=forbidden');
  }

  const [snapshotRes, healthRes, typesRes] = await Promise.all([
    getJobSnapshot(),
    getQueueHealth(),
    getRecentJobTypes(),
  ]);

  const data = snapshotRes.success ? snapshotRes.data : null;
  const health = healthRes.data ?? [];
  const jobTypes = typesRes.data ?? [];

  return (
    <QueuesView
      jobs={data?.jobs ?? []}
      queues={data?.queues ?? []}
      hourly={data?.hourly ?? new Array(24).fill(0)}
      metrics={
        data?.metrics ?? {
          pending: 0,
          running: 0,
          completed24h: 0,
          failed24h: 0,
          dead: 0,
          avgDurationMs: 0,
        }
      }
      queueHealth={health}
      jobTypes={jobTypes}
    />
  );
}
