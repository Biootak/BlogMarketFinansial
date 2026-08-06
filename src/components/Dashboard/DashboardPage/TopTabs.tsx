'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './TopTabs.module.css';

const TABS = [
  { href: '/dashboard', label: 'نبض', index: '۰۱' },
  { href: '/dashboard/reading', label: 'خوانش', index: '۰۲' },
  { href: '/dashboard/queue', label: 'صف', index: '۰۳' },
  { href: '/dashboard/events', label: 'رویداد', index: '۰۴' },
  { href: '/dashboard/services', label: 'سرویس', index: '۰۵' },
  { href: '/dashboard/funnel', label: 'قیف', index: '۰۶' },
  { href: '/dashboard/route', label: 'مسیر', index: '۰۷' },
] as const;

export default function TopTabs() {
  const pathname = usePathname();
  return (
    <nav className={s.tabs} aria-label="ناوبری اطلس">
      <div className={s.inner}>
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href} className={s.tab} data-active={pathname === tab.href ? 'true' : undefined}>
            <span className={s.index}>{tab.index}</span>
            <span>{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
