/**
 * /dashboard/connected-accounts — «اتصال حساب‌ها»
 *
 * کاربرِ لاگین‌شده می‌تواند گوگل/گیت‌هاب را به حسابش وصل یا جدا کند.
 * معماری (Auth.js v5 best practice — 2026-08-14):
 *   - اتصال: signIn(provider) → OAuth dance → callbacks.signIn متوجه session
 *     موجود می‌شود و چون ایمیلِ provider با ایمیلِ کاربرِ فعلی یکی است، اجازهٔ
 *     linking می‌دهد (allowDangerousEmailAccountLinking + گارد email_verified).
 *   - قطع اتصال: اکشن سرور unlinkOAuthAccount با گارد «آخرین روش ورود».
 */

import { getLinkedAccounts } from '@/actions/accountLinksActions';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ConnectedAccountsClient } from './_components/ConnectedAccountsClient';

export const metadata: Metadata = {
  title: 'اتصال حساب‌ها | داشبورد',
  description: 'مدیریت اتصال گوگل و گیت‌هاب به حساب کاربری',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ConnectedAccountsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/auth?callbackUrl=/dashboard/connected-accounts');
  }

  const result = await getLinkedAccounts();

  return (
    <div className="route-frame" dir="rtl">
      <PageHeader
        variant="compact"
        eyebrow="امنیت حساب"
        title="اتصال حساب‌ها"
        description="گوگل یا گیت‌هاب را به حساب خود وصل کنید تا با هر روشی که برایتان راحت‌تر است وارد شوید — همه با همان یک حساب."
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'اتصال حساب‌ها' }]}
        icon="shield-check"
        accent="violet"
      />
      <ConnectedAccountsClient
        initial={
          result.success
            ? result.data
            : { email: session.user.email ?? '', hasPassword: true, accounts: [] }
        }
      />
    </div>
  );
}
