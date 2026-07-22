/**
 * layout.tsx — Exchange Panel
 *
 * Tenant isolation: session را می‌گیرد، exchangeId را resolve می‌کند،
 * به همه child routes از طریق server context پاس می‌دهد.
 * هر صراف فقط داده خودش را می‌بیند.
 */
import '@/app/dashboard/dashboard.css';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import ExchangeShell from '@/components/Exchange/ExchangeShell';
import { redirect } from 'next/navigation';

export default async function ExchangeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const userId = session?.user?.id;
  if (!userId) {
    redirect('/signin');
  }

  const { user } = session;

  // OWNER/ADMIN پلتفرم به /dashboard/exchanges می‌رود نه /exchange
  if (user.role === 'OWNER' || user.role === 'ADMIN') {
    redirect('/dashboard/exchanges');
  }

  // بررسی staff بودن این user در یک صرافی (G2-fix: session داخل action خوانده می‌شود)
  const membership = await getExchangeForUser();
  if (!membership) {
    redirect('/dashboard');
  }

  if (membership.exchange.status === 'SUSPENDED') {
    redirect('/exchange-suspended');
  }

  return (
    <ExchangeShell
      exchange={membership.exchange}
      staffRole={membership.staffRole}
      permissions={membership.permissions}
      userName={user.name ?? user.email ?? ''}
      userImage={user.image ?? null}
    >
      {children}
    </ExchangeShell>
  );
}
