import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { JobCenter } from '@/app/dashboard/jobs/_components/JobCenter';
import { PageHeader } from '@/components/Dashboard/primitives';
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
  const initialData = result.success ? result.data : undefined;

  return (
    <div dir="rtl" className={s.page}>
      <PageHeader
        eyebrow="پلتفرم"
        title="مرکز Job"
        description="صف job، cron، retry و DLQ — همه jobهای پس‌زمینه در یک نما."
        icon="zap"
        accent="amber"
        breadcrumb={[
          { href: '/dashboard', label: 'داشبورد' },
          { label: 'مرکز Job' },
        ]}
      />
      <JobCenter initialData={initialData} />
    </div>
  );
}
