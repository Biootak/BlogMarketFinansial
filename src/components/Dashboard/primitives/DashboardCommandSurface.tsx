'use client';

import { useVisibilityAwareInterval } from '@/hooks/useVisibilityAwareInterval';
import { getAccessibleRoutes } from '@/config/routes';
import { ArrowLeft, Command, LifeBuoy, Radio, Search, ShieldCheck, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';
import s from './DashboardCommandSurface.module.css';

type Portal = 'admin' | 'customer' | 'exchange';

interface DashboardCommandSurfaceProps {
  portal: Portal;
  userName: string;
  role: string;
  children: ReactNode;
}

const roleLabels: Record<string, string> = {
  OWNER: 'مالک', SUPERADMIN: 'سوپرادمین', ADMIN: 'مدیر', AUTHOR: 'نویسنده', SUPPORT: 'پشتیبانی',
  USER: 'کاربر', CUSTOMER: 'مشتری', TEST_CUSTOMER: 'مشتری آزمایشی', MERCHANT: 'پذیرنده', EXCHANGE: 'کارمند صرافی',
};

const LINKS: Record<Portal, ReadonlyArray<{ href: string; label: string; icon: typeof Radio }>> = {
  admin: [
    { href: '/dashboard/service-requests', label: 'صف درخواست‌ها', icon: Radio },
    { href: '/dashboard/observability', label: 'سلامت سامانه', icon: ShieldCheck },
    { href: '/dashboard/helpdesk', label: 'تیکت‌ها', icon: LifeBuoy },
  ],
  customer: [
    { href: '/customer/transactions', label: 'تراکنش‌ها', icon: WalletCards },
    { href: '/customer/kyc', label: 'احراز هویت', icon: ShieldCheck },
    { href: '/customer/security', label: 'امنیت', icon: LifeBuoy },
  ],
  exchange: [
    { href: '/exchange/transactions', label: 'تراکنش‌ها', icon: WalletCards },
    { href: '/exchange/quotes', label: 'قیمت‌گذاری', icon: Radio },
    { href: '/exchange/kyc-review', label: 'بررسی KYC', icon: ShieldCheck },
  ],
};

const PORTAL_LABEL: Record<Portal, string> = {
  admin: 'مرکز عملیات مالی', customer: 'پورتال مشتری', exchange: 'اتاق عملیات صرافی',
};

function formatClock(date: Date): string {
  return new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Kabul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
}

/** مسیرهای پورتال ادمین بر پایهٔ نقش فیلتر می‌شوند تا لینکِ redirect-شونده نمانَد. */
function isReachable(href: string, accessible: readonly string[]): boolean {
  return accessible.some((route) => route === href || href.startsWith(`${route}/`));
}

export function DashboardCommandSurface({ portal, userName, role, children }: DashboardCommandSurfaceProps) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  useVisibilityAwareInterval(() => setNow(new Date()), 30_000);
  const accessible = portal === 'admin' ? getAccessibleRoutes(role) : null;
  const links = accessible ? LINKS[portal].filter(({ href }) => isReachable(href, accessible)) : LINKS[portal];
  const guideHref = portal === 'customer' ? '/customer/settings' : portal === 'exchange' ? '/exchange/settings' : '/dashboard/site-guide';
  const showGuide = portal !== 'admin' || ['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role);

  return (
    <div className={s.surface} data-portal={portal} dir="rtl">
      <header className={s.commandBar} aria-label="نوار فرمان داشبورد">
        <div className={s.identity}>
          <span className={s.signal} aria-hidden="true" />
          <span className={s.identityCopy}>
            <span className={s.kicker}>{PORTAL_LABEL[portal]}</span>
            <span className={s.greeting}>سلام، {userName || 'مدیر'}</span>
          </span>
        </div>
        {links.length > 0 && (
        <nav className={s.commandNav} aria-label="میان‌برهای عملیاتی">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={s.commandLink}>
              <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        )}
        <div className={s.commandMeta}>
          <span className={s.time} dir="ltr" aria-label="زمان کابل" suppressHydrationWarning>
            {now ? formatClock(now) : '--:--'}
          </span>
          <span className={s.role}>{roleLabels[role] ?? role}</span>
          {showGuide && (
          <Link href={guideHref} className={s.commandButton} aria-label="تنظیمات و راهنما">
            <Search size={15} strokeWidth={1.7} aria-hidden="true" />
          </Link>
          )}
          <span className={s.commandHint} aria-hidden="true"><Command size={13} strokeWidth={1.7} />K</span>
        </div>
      </header>
      <div className={s.content}>{children}</div>
      {showGuide && (
      <Link href={guideHref} className={s.mobileGuide}>
        مسیرها و تنظیمات <ArrowLeft size={14} strokeWidth={1.7} aria-hidden="true" />
      </Link>
      )}
    </div>
  );
}
