import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ApprovalsHub } from '@/app/dashboard/approvals/_components/ApprovalsHub';
import { PageHeader } from '@/components/Dashboard/primitives';
import { getApprovalSnapshot } from '@/lib/approvals';
import s from './approvals.module.css';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/dashboard/approvals');
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/dashboard?error=forbidden');
  }

  const result = await getApprovalSnapshot();
  const initialData = result.success ? result.data : undefined;

  return (
    <div dir="rtl" className={s.page}>
      <PageHeader
        eyebrow="پلتفرم"
        title="تأییدیه‌ها"
        description="جریان‌های تأیید چندمرحله‌ای برای settlement، KYC، refund و withdrawal."
        icon="workflow"
        accent="emerald"
        breadcrumb={[
          { href: '/dashboard', label: 'داشبورد' },
          { label: 'تأییدیه‌ها' },
        ]}
      />
      <ApprovalsHub initialData={initialData} />
    </div>
  );
}
