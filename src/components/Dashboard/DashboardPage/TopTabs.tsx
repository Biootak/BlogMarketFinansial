'use client';

import { getMenu, type MenuItem, type UserRole } from './sidebar-menu';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import s from './TopTabs.module.css';

interface TopTabsProps {
  userRole: UserRole;
  staffRole?: string;
}

function isActive(pathname: string, href: string) {
  return href === '/dashboard' || href === '/customer/dashboard' || href === '/exchange/dashboard'
    ? pathname === href
    : pathname.startsWith(href);
}

function flatten(items: MenuItem[], userRole: UserRole, staffRole?: string): MenuItem[] {
  return items.filter((item) => {
    if (userRole !== 'EXCHANGE' || !item.roles?.length) return true;
    return !!staffRole && item.roles.includes(staffRole);
  });
}

export default function TopTabs({ userRole, staffRole }: TopTabsProps) {
  const pathname = usePathname();
  const tabs = getMenu(userRole).flatMap((section) => flatten(section.items, userRole, staffRole));

  return (
    <nav className={s.tabs} aria-label="ناوبری اصلی داشبورد">
      <div className={s.inner}>
        {tabs.map((tab) => (
          <Link key={tab.id} href={tab.href} className={s.tab} data-active={isActive(pathname, tab.href) ? 'true' : undefined} title={tab.title || tab.label}>
            <span className={s.icon} aria-hidden="true">{tab.icon as ReactNode}</span>
            <span>{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
