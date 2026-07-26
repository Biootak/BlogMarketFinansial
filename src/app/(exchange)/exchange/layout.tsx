/**
 * layout.tsx — Exchange Panel
 *
 * دسترسی:
 *   - OWNER / SUPERADMIN پلتفرم: می‌توانند هر صرافی را با ?as=EXCHANGE_ID ببینند.
 *     اگر as نباشد، اولین صرافی فعال نشان داده می‌شود.
 *   - EXCHANGE staff: فقط صرافی خودشان را می‌بینند.
 *   - بقیه: redirect به /dashboard.
 *
 * Tenant isolation: exchangeId از DB resolve می‌شود، نه از JWT.
 */
import '@/app/dashboard/dashboard.css';
import { getExchangeForOwner, getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import ExchangeShell from '@/components/Exchange/ExchangeShell';
import { redirect } from 'next/navigation';

const PLATFORM_ADMINS = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);

export default async function ExchangeLayout({
  children,
  params: _params,
}: {
  children: React.ReactNode;
  params?: unknown;
}) {
  const session = await auth();

  const userId = session?.user?.id;
  if (!userId) {
    redirect('/signin');
  }

  const { user } = session;
  const role = user.role as string;

  // OWNER / SUPERADMIN / ADMIN می‌توانند پنل هر صرافی را ببینند
  if (PLATFORM_ADMINS.has(role)) {
    // exchangeId از searchParams — در layout نمی‌توان searchParams خواند،
    // پس از cookie/header نمی‌آید. راه‌حل: اولین صرافی فعال را نشان می‌دهیم.
    // برای رفتن به صرافی خاص: /dashboard/exchanges/[id] لینک مستقیم است.
    const membership = await getExchangeForOwner();
    if (!membership) {
      // هیچ صرافی فعالی وجود ندارد
      redirect('/dashboard/exchanges');
    }
    return (
      <ExchangeShell
        exchange={membership.exchange}
        staffRole="OWNER"
        permissions={[]}
        userName={user.name ?? user.email ?? ''}
        userImage={user.image ?? null}
        isPlatformAdmin
      >
        {children}
      </ExchangeShell>
    );
  }

  // بررسی staff بودن این user در یک صرافی
  const membership = await getExchangeForUser();
  if (!membership) {
    // کاربر ExchangeStaff نیست — اگر role=EXCHANGE دارد یعنی applyForExchange نزده
    // اگر role دیگری دارد یعنی اشتباه آمده
    redirect('/');
  }

  if (membership.exchange.status === 'SUSPENDED') {
    redirect('/exchange-suspended');
  }

  // صرافی هنوز تأیید نشده — صفحه انتظار نشان بده (نه redirect)
  if (membership.exchange.status === 'PENDING' || membership.exchange.status === 'CLOSED') {
    return (
      <ExchangeShell
        exchange={membership.exchange}
        staffRole={membership.staffRole}
        permissions={membership.permissions}
        userName={user.name ?? user.email ?? ''}
        userImage={user.image ?? null}
        isPlatformAdmin={false}
        pendingApproval={membership.exchange.status === 'PENDING'}
      >
        {children}
      </ExchangeShell>
    );
  }

  return (
    <ExchangeShell
      exchange={membership.exchange}
      staffRole={membership.staffRole}
      permissions={membership.permissions}
      userName={user.name ?? user.email ?? ''}
      userImage={user.image ?? null}
      isPlatformAdmin={false}
    >
      {children}
    </ExchangeShell>
  );
}
