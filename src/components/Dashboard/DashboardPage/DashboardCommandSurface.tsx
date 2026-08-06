'use client';

import { useVisibilityAwareInterval } from '@/hooks/useVisibilityAwareInterval';
import { ArrowLeft, Command, LifeBuoy, Radio, Search, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';
import s from './DashboardCommandSurface.module.css';

interface DashboardCommandSurfaceProps {
  userName: string;
  role: string;
  children: ReactNode;
}

const roleLabels: Record<string, string> = {
  OWNER: 'مالک',
  SUPERADMIN: 'سوپرادمین',
  ADMIN: 'مدیر',
  AUTHOR: 'نویسنده',
  SUPPORT: 'پشتیبانی',
  USER: 'کاربر',
};

const commandLinks = [
  { href: '/dashboard/service-requests', label: 'صف درخواست‌ها', icon: Radio },
  { href: '/dashboard/observability', label: 'سلامت سامانه', icon: ShieldCheck },
  { href: '/dashboard/helpdesk', label: 'تیکت‌ها', icon: LifeBuoy },
] as const;

function formatClock(date: Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function DashboardCommandSurface({ userName, role, children }: DashboardCommandSurfaceProps) {
  const [now, setNow] = useState(() => new Date());
  useVisibilityAwareInterval(() => setNow(new Date()), 30_000);

  return (
    <div className={s.surface} dir="rtl">
      <header className={s.commandBar} aria-label="نوار فرمان داشبورد">
        <div className={s.identity}>
          <span className={s.signal} aria-hidden="true" />
          <span className={s.identityCopy}>
            <span className={s.kicker}>مرکز عملیات مالی</span>
            <span className={s.greeting}>سلام، {userName || 'مدیر'}</span>
          </span>
        </div>

        <nav className={s.commandNav} aria-label="میان‌برهای عملیاتی">
          {commandLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={s.commandLink}>
              <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className={s.commandMeta}>
          <span className={s.time} dir="ltr" aria-label="زمان تهران">
            {formatClock(now)}
          </span>
          <span className={s.role}>{roleLabels[role] ?? role}</span>
          <Link href="/dashboard/site-guide" className={s.commandButton} aria-label="راهنمای داشبورد">
            <Search size={15} strokeWidth={1.7} aria-hidden="true" />
          </Link>
          <span className={s.commandHint} aria-hidden="true">
            <Command size={13} strokeWidth={1.7} />K
          </span>
        </div>
      </header>
      <main className={s.content}>{children}</main>
      <Link href="/dashboard/site-guide" className={s.mobileGuide}>
        راهنمای مسیرها <ArrowLeft size={14} strokeWidth={1.7} aria-hidden="true" />
      </Link>
    </div>
  );
}

export default DashboardCommandSurface;
