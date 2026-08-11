import { getUsers } from '@/actions/userActions';
import { requireAdmin } from '@/lib/require-auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { UsersClient } from './_components/UsersClient';

export const metadata: Metadata = {
  title: 'کاربران | داشبورد',
  description: 'مدیریت اعضا، نقش‌ها و دسترسی‌ها',
};

interface Props {
  searchParams: Promise<{
    q?: string;
    status?: string;
    role?: string;
    page?: string;
  }>;
}

export default async function UsersPage({ searchParams }: Props) {
  const auth = await requireAdmin();
  if (!auth.success) redirect('/dashboard');

  const sp = await searchParams;
  const search = sp.q ?? '';
  const status = sp.status;
  const role = sp.role;
  const page = Math.max(1, Number(sp.page ?? 1));

  const result = await getUsers({
    page,
    limit: 12,
    search,
    status: status && status !== 'all' ? status : undefined,
    role: role && role !== 'all' ? role : undefined,
  });

  const { users, totalCount } = result.success
    ? (result.data ?? { users: [], totalCount: 0 })
    : { users: [], totalCount: 0 };

  return (
    <div className="route-frame" dir="rtl">
      <UsersClient
        users={users}
        totalCount={totalCount}
        currentPage={page}
        currentSearch={search}
        currentStatus={status ?? 'all'}
        currentRole={role ?? 'all'}
        currentUserRole={auth.user.role}
        currentUserId={auth.user.id}
      />
    </div>
  );
}
