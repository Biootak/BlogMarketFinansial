import { getRoleStats } from '@/actions/role-actions';
import { auth } from '@/auth';
import { PageHeader, Section } from '@/components/Dashboard/primitives';
import { redirect } from 'next/navigation';
import RolesClient from './_components/RolesClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'نقش‌ها | داشبورد',
};

export default async function RolesPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth?callbackUrl=/dashboard/roles');

  const result = await getRoleStats();
  const stats = result.success ? result.data.stats : [];

  return (
    <div className="route-frame" dir="rtl">
      <PageHeader
        breadcrumb={[
          { label: 'مرکز فرماندهی', href: '/dashboard' },
          { label: 'مدیریت دسترسی' },
          { label: 'نقش‌ها' },
        ]}
        eyebrow="مدیریت دسترسی"
        title="نقش‌ها"
        description="تعریف، ویرایش و کلون نقش‌های سفارشی با ماتریس مجوز granular."
        icon="shield-check"
        accent="violet"
      />

      <Section>
        <RolesClient stats={stats} currentUserRole={session.user.role ?? 'USER'} />
      </Section>
    </div>
  );
}
