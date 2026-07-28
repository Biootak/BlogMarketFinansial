/**
 * /exchange/settings/layout — shell مشترک برای settings sub-routes.
 *
 * شامل:
 *   - SettingsSubNavHost (timeline vertical) در سمت چپ (RTL: راست)
 *   - main area برای children
 *
 * children می‌تواند server یا client component باشد.
 */

import { PageHeader } from '@/components/Dashboard/primitives';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import {
  type SettingsSubNavItem,
  SettingsSubNavHost,
} from '@/components/Dashboard/primitives';
import { redirect } from 'next/navigation';
import s from './layout.module.css';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');
  if (!['OWNER', 'MANAGER'].includes(membership.staffRole)) {
    redirect('/exchange/dashboard');
  }

  const items: SettingsSubNavItem[] = [
    {
      key: 'overview',
      href: '/exchange/settings',
      label: 'نمای کلی',
      description: 'خلاصه وضعیت و دسترسی سریع',
      iconName: 'activity',
    },
    {
      key: 'identity',
      href: '/exchange/profile',
      label: 'هویت عمومی',
      description: 'نام، لوگو، تماس و ساعات کاری',
      iconName: 'building',
      recommended: true,
    },
    {
      key: 'operations',
      href: '/exchange/settings/operations',
      label: 'عملیات و کارمزد',
      description: 'KYC، سقف تراکنش و کارمزدها',
      iconName: 'cog',
    },
    {
      key: 'hours',
      href: '/exchange/settings/working-hours',
      label: 'ساعات کاری',
      description: 'برنامه هفتگی و روزهای تعطیل',
      iconName: 'clock',
    },
    {
      key: 'security',
      href: '/exchange/settings/security',
      label: 'امنیت و دسترسی',
      description: 'اعضا، نقش‌ها و نشست‌ها',
      iconName: 'shield',
    },
  ];

  return (
    <div className={s.shell}>
      <PageHeader
        title="تنظیمات صرافی"
        description="پیکربندی عملیاتی، امنیتی و اطلاعات عمومی"
        breadcrumb={[
          { label: 'پنل صرافی', href: '/exchange/dashboard' },
          { label: 'تنظیمات' },
        ]}
        icon="settings"
        accent="emerald"
        eyebrow="Workspace"
      />

      <div className={s.layout}>
        <aside className={s.aside} aria-label="ناوبری تنظیمات">
          <SettingsSubNavHost items={items} />
        </aside>
        <main className={s.main}>{children}</main>
      </div>
    </div>
  );
}
