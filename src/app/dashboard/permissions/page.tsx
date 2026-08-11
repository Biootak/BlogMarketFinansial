import { getPermissions } from '@/actions/permission-actions';
import { requireAdmin } from '@/lib/require-auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/Dashboard/primitives';
import PermissionsClient from './_components/PermissionsClient';

export const metadata: Metadata = {
  title: 'مجوزها | داشبورد',
  description: 'مدیریت ماتریس نقش‌ها و مجوزهای سیستم',
};

export default async function PermissionsPage() {
  const auth = await requireAdmin();
  if (!auth.success) redirect('/dashboard');

  const result = await getPermissions();

  const data = result.success && result.data ? result.data : { permissions: [], matrix: [] };

  return (
    <div className="route-frame" dir="rtl">
      <PageHeader
        variant="compact"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'مجوزها' }]}
        title="مجوزها"
        description="مدیریت ماتریس نقش‌ها و مجوزهای سیستم"
        eyebrow="امنیت"
        icon="shield-check"
        accent="violet"
      />
      <PermissionsClient
        permissions={data.permissions}
        matrix={data.matrix}
        currentUserRole={auth.user.role}
      />
    </div>
  );
}
