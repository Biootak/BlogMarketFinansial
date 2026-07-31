import { getUserDetail, getUserFinancials } from '@/actions/user-detail';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import UserDetail from './_components/UserDetail';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const detail = await getUserDetail(id).catch(() => null);
  if (!detail?.success) return { title: 'کاربر یافت نشد' };
  return { title: `${detail.data.name ?? detail.data.email} | مدیریت کاربران` };
}

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;

  // Auth happens server-side; the page is gated by the dashboard layout
  // (DashboardGate → requireAuth). The action itself enforces RBAC.
  const session = await auth();

  const [detail, financials] = await Promise.all([
    getUserDetail(id),
    getUserFinancials(id).catch(() => ({ success: false as const, message: 'no-access' })),
  ]);

  if (!detail.success) {
    notFound();
  }

  return (
    <div className="at-page" dir="rtl">
      <UserDetail
        user={detail.data}
        financials={financials.success ? financials.data : null}
        currentUserId={session?.user?.id ?? ''}
        currentUserRole={session?.user?.role ?? 'USER'}
      />
    </div>
  );
}
