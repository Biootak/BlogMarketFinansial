import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { ApprovalsHub } from '@/app/dashboard/approvals/_components/ApprovalsHub';
import { auth } from '@/auth';
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
  // SUPPORT-fix: SUPPORT می‌تواند تأییدیه‌ها را ببیند (نمای پشتیبانی)
  if (!['OWNER', 'SUPERADMIN', 'ADMIN', 'SUPPORT'].includes(role)) {
    redirect('/dashboard?error=forbidden');
  }

  const result = await getApprovalSnapshot();
  const initialData = result.success ? result.data : undefined;

  const canCreate = role === 'OWNER' || role === 'SUPERADMIN';

  return (
    <div dir="rtl" className={s.page}>
      <PageHeader
        eyebrow="پلتفرم"
        title="مرکز تأییدیه‌ها"
        description="جریان‌های تأیید چندمرحله‌ای برای تسویه، احراز هویت، استرداد، برداشت و درخواست‌های سفارشی."
        icon="workflow"
        accent="emerald"
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'تأییدیه‌ها' }]}
      />
      <Suspense fallback={null}>
        <ApprovalsHub initialData={initialData} canCreate={canCreate} />
      </Suspense>
    </div>
  );
}
