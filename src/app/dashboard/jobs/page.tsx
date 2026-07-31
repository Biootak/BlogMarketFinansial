import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { JobCenter } from '@/app/dashboard/jobs/_components/JobCenter';
import type { QueueHealthDisplay } from '@/app/dashboard/jobs/_components/JobQueueMatrix';
import { getJobSnapshot, getQueueHealth } from '@/lib/jobs';
import s from './jobs.module.css';

export const dynamic = 'force-dynamic';

/** نرخ ورودی — تعداد jobهای created در ۵ دقیقه اخیر ÷ ۵ */
function calcInflowPerMin(jobs: Array<{ createdAt: string }>): number {
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const count = jobs.filter((j) => new Date(j.createdAt).getTime() >= fiveMinAgo).length;
  return Math.round((count / 5) * 10) / 10;
}

/** نرخ خروجی موفق — تعداد jobهای completed در ۵ دقیقه اخیر ÷ ۵ */
function calcOutflowPerMin(jobs: Array<{ completedAt: string | null }>): number {
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const count = jobs.filter(
    (j) => j.completedAt && new Date(j.completedAt).getTime() >= fiveMinAgo,
  ).length;
  return Math.round((count / 5) * 10) / 10;
}

export default async function JobsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/dashboard/jobs');
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/dashboard?error=forbidden');
  }

  const [snapshotRes, queueHealthRes] = await Promise.all([getJobSnapshot(), getQueueHealth()]);

  const data = snapshotRes.success ? snapshotRes.data : undefined;
  const metrics = data?.metrics ?? {
    pending: 0,
    running: 0,
    completed24h: 0,
    failed24h: 0,
    dead: 0,
    avgDurationMs: 0,
  };
  const recentJobs = data?.jobs ?? [];
  const hourly = data?.hourly ?? new Array(24).fill(0);

  // تبدیل QueueHealth → QueueHealthDisplay برای کامپوننت
  const queueHealth: QueueHealthDisplay[] = (queueHealthRes.data ?? []).map((q) => ({
    name: q.name,
    pending: q.pending,
    completed24h: q.completed24h,
    failed24h: q.failed24h,
    dead: q.dead,
    failureRate: q.failureRate,
    score: q.score,
    status: q.status,
  }));

  const inflowPerMin = calcInflowPerMin(recentJobs);
  const outflowPerMin = calcOutflowPerMin(recentJobs);

  return (
    <div dir="rtl" className={s.page}>
      <JobCenter
        totalJobs={recentJobs.length}
        metrics={metrics}
        hourly={hourly}
        queueHealth={queueHealth}
        recentJobs={recentJobs}
        inflowPerMin={inflowPerMin}
        outflowPerMin={outflowPerMin}
      />
    </div>
  );
}
