import { getUserDetail, getUserFinancials } from '@/actions/user-detail';
import { auth } from '@/auth';
import UserDetail from './_components/UserDetail';
import s from './user-detail.module.css';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
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
    return (
      <div className="at-page" dir="rtl">
        <div className={s.notFound}>
          <h2 className={s.notFoundTitle}>دسترسی ممکن نیست</h2>
          <p className={s.notFoundText}>{detail.message}</p>
        </div>
      </div>
    );
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
