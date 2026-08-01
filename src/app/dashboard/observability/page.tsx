import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ObservabilityHub } from '@/app/dashboard/observability/_components/ObservabilityHub';
import { PageHeader } from '@/components/Dashboard/primitives';
import { getObservabilitySnapshot } from '@/lib/observability';
import s from './observability.module.css';

export const dynamic = 'force-dynamic';

export default async function ObservabilityPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/dashboard/observability');
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/dashboard?error=forbidden');
  }

  const result = await getObservabilitySnapshot();
  const initialData = result.success ? result.data : undefined;

  return (
    <div dir="rtl" className={s.page}>
      <PageHeader
        variant="minimal"
        eyebrow="مرکز عملیات"
        title="مرکز مشاهده‌پذیری"
        description="نمای زنده از سلامت سرویس‌ها، خطاها، کارایی و incidentها. همه داده‌ها از SystemLog و AuditLog خوانده می‌شوند."
        icon="radar"
        accent="cyan"
        breadcrumb={[
          { href: '/dashboard', label: 'داشبورد' },
          { label: 'مرکز پایش' },
        ]}
      />
      <ObservabilityHub initialData={initialData} />
    </div>
  );
}
