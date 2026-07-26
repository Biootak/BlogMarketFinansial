/**
 * layout.tsx — Customer Portal
 *
 * دسترسی:
 *   - CUSTOMER / TEST_CUSTOMER / MERCHANT: Customer record خودشان
 *   - OWNER / SUPERADMIN / ADMIN پلتفرم: می‌توانند وارد شوند (برای پشتیبانی)
 *   - بقیه: redirect به /
 *
 * Tenant isolation: customerId از DB resolve می‌شود، نه از JWT.
 */
import '@/app/dashboard/dashboard.css';
import { getCustomerProfile, getUnreadNotificationCount } from '@/actions/customer-portal';
import { auth } from '@/auth';
import CustomerShell from '@/components/CustomerPortal/CustomerShell';
import { redirect } from 'next/navigation';

const PLATFORM_ADMINS = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/customer/dashboard');
  }

  const { user } = session;
  const role = user.role as string;

  const [profile, unreadCount] = await Promise.all([
    getCustomerProfile(),
    getUnreadNotificationCount(),
  ]);

  if (!profile) {
    if (PLATFORM_ADMINS.has(role)) {
      redirect('/dashboard');
    }
    redirect('/');
  }

  const isPlatformAdmin = PLATFORM_ADMINS.has(role);

  return (
    <CustomerShell
      profile={profile}
      userName={user.name ?? user.email ?? ''}
      userImage={user.image ?? null}
      isPlatformAdmin={isPlatformAdmin}
      unreadCount={unreadCount}
    >
      {children}
    </CustomerShell>
  );
}
