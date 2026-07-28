'use client';

/**
 * StaffTabs — نوار ناوبری زیرمسیرهای صفحه تیم.
 * شامل: overview / permissions / activity
 */

import { Activity, LayoutGrid, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './StaffCockpit.module.css';

interface TabItem {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  badge?: number;
  match: (path: string) => boolean;
}

interface Props {
  activityCount?: number;
}

export function StaffTabs({ activityCount }: Props) {
  const pathname = usePathname();
  const tabs: TabItem[] = [
    {
      href: '/exchange/staff',
      label: 'نمای کلی',
      icon: LayoutGrid,
      match: (p) => p === '/exchange/staff',
    },
    {
      href: '/exchange/staff/permissions',
      label: 'دسترسی‌ها',
      icon: ShieldCheck,
      match: (p) => p.startsWith('/exchange/staff/permissions'),
    },
    {
      href: '/exchange/staff/activity',
      label: 'لاگ فعالیت',
      icon: Activity,
      badge: activityCount,
      match: (p) => p.startsWith('/exchange/staff/activity'),
    },
  ];

  return (
    <nav className={s.tabs} aria-label="زیرمسیرهای تیم">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.match(pathname ?? '');
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={s.tab}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={13} strokeWidth={2} aria-hidden />
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={s.tabBadge}>{tab.badge.toLocaleString('fa-IR')}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
