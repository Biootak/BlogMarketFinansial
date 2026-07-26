import { getRoleStats } from '@/actions/role-actions';
import { requireAdmin } from '@/lib/require-auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import RolesClient from './_components/RolesClient';

export const metadata: Metadata = {
  title: 'نقش‌ها | داشبورد',
  description: 'مدیریت نقش‌ها و سطوح دسترسی کاربران پلتفرم',
};

export default async function RolesPage() {
  const auth = await requireAdmin();
  if (!auth.success) redirect('/dashboard');

  const result = await getRoleStats();
  const stats = result.success && result.data ? result.data.stats : [];

  return (
    <div className="at-page" dir="rtl">
      <RolesClient stats={stats} currentUserRole={auth.user.role} />
    </div>
  );
}
