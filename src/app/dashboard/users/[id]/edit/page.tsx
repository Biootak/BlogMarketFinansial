import { getUserDetail } from '@/actions/user-detail';
import { requireAdmin } from '@/lib/require-auth';
import type { Role } from '@prisma/client';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/Dashboard/primitives';
import { UserEditForm } from './UserEditForm';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: 'ویرایش کاربر | داشبورد',
};

/**
 * /dashboard/users/[id]/edit — ویرایش کاربر.
 *
 * C2-fix (2026-08-01): دکمهٔ «ویرایش» در UserDetail به این مسیر لینک می‌داد
 * ولی صفحه نداشت → 404. حالا فرم ویرایش واقعی است (updateUser server action).
 */
export default async function UserEditPage({ params }: Props) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (!auth.success) redirect('/dashboard');

  const detail = await getUserDetail(id).catch(() => null);
  if (!detail?.success) notFound();

  const user = detail.data;

  return (
    <div className="at-page" dir="rtl">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
        <PageHeader
          breadcrumb={[
            { label: 'داشبورد', href: '/dashboard' },
            { label: 'کاربران', href: '/dashboard/users' },
            { label: user.name ?? user.email },
            { label: 'ویرایش' },
          ]}
          title="ویرایش کاربر"
          description={`ویرایش اطلاعات کاربر «${user.name ?? user.email}»`}
          icon="user-cog"
          accent="indigo"
        />
        <UserEditForm
          userId={id}
          initialName={user.name ?? ''}
          initialEmail={user.email}
          initialPhone={user.phoneNumber ?? ''}
          initialRole={user.role as Role}
          initialStatus={user.status}
        />
      </div>
    </div>
  );
}
