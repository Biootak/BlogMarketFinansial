'use client';

/**
 * CustomerShell — shell پورتال مشتری.
 *
 * از PanelShell مشترک استفاده می‌کند.
 * فقط منطق اختصاصی مشتری اینجاست:
 *   - KYC badge در sidebar
 *   - notification dot در topbar
 *   - وضعیت حساب در topbar
 */

import type { CustomerProfile } from '@/actions/customer-portal';
import PanelShell from '@/components/Dashboard/shared/PanelShell';
import { KYC_STATUS_FA } from '@/lib/exchange-labels';
import {
  Bell,
  CircleDollarSign,
  CreditCard,
  FileText,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  User,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import s from './CustomerShell.module.css';

interface Props {
  profile: CustomerProfile;
  userName?: string;
  userImage: string | null;
  children: ReactNode;
  isPlatformAdmin?: boolean;
  unreadCount?: number;
}

const NAV_ITEMS = [
  { href: '/customer/dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/customer/accounts', label: 'حساب‌ها', icon: CreditCard },
  { href: '/customer/transactions', label: 'تراکنش‌ها', icon: CircleDollarSign },
  { href: '/customer/kyc', label: 'احراز هویت', icon: ShieldCheck },
  { href: '/customer/documents', label: 'مدارک', icon: FileText },
  { href: '/customer/notifications', label: 'اعلان‌ها', icon: Bell },
  { href: '/customer/profile', label: 'پروفایل', icon: User },
  { href: '/customer/settings', label: 'تنظیمات', icon: Settings },
] as const;

export default function CustomerShell({
  profile,
  userImage,
  children,
  isPlatformAdmin = false,
  unreadCount = 0,
}: Props) {
  // badge تعداد اعلان را به nav item اضافه می‌کند
  const navItemsWithBadge = NAV_ITEMS.map((item) =>
    item.href === '/customer/notifications' && unreadCount > 0
      ? { ...item, badge: unreadCount }
      : item,
  );

  return (
    <PanelShell
      brandIcon={<CircleDollarSign className="w-5 h-5" aria-hidden />}
      brandName={profile.exchange.name}
      brandSub={profile.exchange.city ?? 'پنل مشتری'}
      navItems={navItemsWithBadge}
      userName={profile.fullName}
      userImage={userImage}
      userSub={profile.phone}
      adminBackHref={isPlatformAdmin ? '/dashboard' : undefined}
      sidebarExtra={
        <div className="px-4 py-2">
          <div className={cn(s.kycBadge, "rounded-lg border border-neutral-200/60 bg-white/50 p-2")} data-kyc={profile.kycStatus}>
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
            <span className="text-[11px] font-semibold">KYC: {KYC_STATUS_FA[profile.kycStatus] ?? profile.kycStatus}</span>
          </div>
        </div>
      }
      topbarExtra={
        <div className={s.topbarInfo}>
          <span className={s.topbarName}>{profile.fullName}</span>
          {unreadCount > 0 && (
            <Link
              href="/customer/notifications"
              className={s.topbarNotif}
              aria-label={`${unreadCount} اعلان خوانده‌نشده`}
            >
              <Bell className="w-4 h-4" aria-hidden />
              <span className={s.topbarNotifDot} aria-hidden />
            </Link>
          )}
          <span className={s.topbarStatus} data-status={profile.status}>
            {profile.status === 'ACTIVE'
              ? '● فعال'
              : profile.status === 'FROZEN'
                ? '● منجمد'
                : '○ غیرفعال'}
          </span>
        </div>
      }
    >
      {children}
    </PanelShell>
  );
}
