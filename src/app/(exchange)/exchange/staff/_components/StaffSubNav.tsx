'use client';

/**
 * StaffSubNav — نوار ناوبری زیرمسیرهای صفحه تیم.
 * استفاده در /staff/permissions و /staff/activity.
 */

import { Activity, LayoutGrid, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './StaffCockpit.module.css';

type Tab = 'overview' | 'permissions' | 'activity';

interface Props {
  active: Tab;
  activityCount?: number;
}

const TABS: ReadonlyArray<{
  key: Tab;
  href: string;
  label: string;
  icon: typeof LayoutGrid;
}> = [
  { key: 'overview', href: '/exchange/staff', label: 'نمای کلی', icon: LayoutGrid },
  { key: 'permissions', href: '/exchange/staff/permissions', label: 'دسترسی‌ها', icon: ShieldCheck },
  { key: 'activity', href: '/exchange/staff/activity', label: 'لاگ فعالیت', icon: Activity },
];

export function StaffSubNav({ active, activityCount }: Props) {
  const pathname = usePathname();
  return (
    <nav className={s.tabs} aria-label="زیرمسیرهای تیم">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          tab.key === active || (tab.key === 'overview' && pathname === '/exchange/staff');
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={s.tab}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={13} strokeWidth={2} aria-hidden />
            {tab.label}
            {tab.key === 'activity' && activityCount !== undefined && activityCount > 0 && (
              <span className={s.tabBadge}>{activityCount.toLocaleString('fa-IR')}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
