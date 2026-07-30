import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { JobCenter, type JobCenterData } from '@/app/dashboard/jobs/_components/JobCenter';
import { getJobSnapshot } from '@/lib/jobs';
import s from './jobs.module.css';

export const dynamic = 'force-dynamic';

export default async function JobsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/dashboard/jobs');
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/dashboard?error=forbidden');
  }

  const result = await getJobSnapshot();
  const raw = result.success ? result.data : undefined;

  const base: JobCenterData = raw
    ? { ...raw, recentEvents: [] }
    : {
        generatedAt: new Date().toISOString(),
        jobs: [],
        metrics: { pending: 0, running: 0, completed24h: 0, failed24h: 0, dead: 0, avgDurationMs: 0 },
        queues: [],
        hourly: new Array(24).fill(0),
        recentEvents: [],
      };

  // گزارش فعالیت اخیر از jobهای واقعی
  base.recentEvents = base.jobs.slice(0, 12).map((j) => {
    let tone: 'emerald' | 'indigo' | 'amber' | 'rose' | 'cyan' | 'violet' = 'neutral';
    if (j.status === 'completed') tone = 'emerald';
    else if (j.status === 'running') tone = 'indigo';
    else if (j.status === 'pending') tone = 'amber';
    else if (j.status === 'failed' || j.status === 'dead') tone = 'rose';
    const at = j.completedAt ?? j.startedAt ?? j.failedAt ?? j.createdAt;
    return {
      id: j.id,
      at,
      title: j.type,
      detail:
        j.status === 'completed'
          ? 'job تکمیل شد'
          : j.status === 'running'
            ? 'در حال اجرا'
            : j.status === 'pending'
              ? 'در صف'
              : j.status === 'failed'
                ? 'ناموفق — در تلاش مجدد'
                : 'job مرده — نیاز به بررسی',
      tone,
    };
  });

  return (
    <div dir="rtl" className={s.page}>
      <JobCenter initialData={base} />
    </div>
  );
}
