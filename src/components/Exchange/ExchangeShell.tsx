'use client';

/**
 * ExchangeShell — shell پنل صراف.
 *
 * از PanelShell مشترک استفاده می‌کند.
 * فقط منطق اختصاصی صرافی اینجاست:
 *   - لیست nav items با roles
 *   - pending approval banner
 *   - topbar: نام صرافی + وضعیت فعال
 */

import type { ExchangeRow } from '@/actions/exchanges';
import PanelShell from '@/components/Dashboard/shared/PanelShell';
import { STAFF_ROLE_FA } from '@/lib/exchange-labels';
import {
  BarChart3,
  Building2,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Receipt,
  Settings,
  Store,
  Tag,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import s from './ExchangeShell.module.css';

interface Props {
  exchange: ExchangeRow;
  staffRole: string;
  permissions: string[];
  userName: string;
  userImage: string | null;
  children: ReactNode;
  isPlatformAdmin?: boolean;
  pendingApproval?: boolean;
}

const NAV_ITEMS = [
  { href: '/exchange/dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/exchange/quotes', label: 'قیمت‌گذاری', icon: Tag },
  { href: '/exchange/customers', label: 'مشتریان', icon: Users },
  { href: '/exchange/transactions', label: 'تراکنش‌ها', icon: CircleDollarSign },
  { href: '/exchange/rates', label: 'نرخ‌ها', icon: BarChart3 },
  { href: '/exchange/staff', label: 'کارمندان', icon: Building2, roles: ['OWNER', 'MANAGER'] },
  { href: '/exchange/reports', label: 'گزارش‌ها', icon: FileText },
  {
    href: '/exchange/settlement',
    label: 'تسویه‌حساب',
    icon: Receipt,
    roles: ['OWNER', 'MANAGER'],
  },
  {
    href: '/exchange/profile',
    label: 'پروفایل صرافی',
    icon: Store,
    roles: ['OWNER', 'MANAGER'],
  },
  { href: '/exchange/settings', label: 'تنظیمات', icon: Settings, roles: ['OWNER', 'MANAGER'] },
] as const;

export default function ExchangeShell({
  exchange,
  staffRole,
  permissions: _permissions,
  userName,
  userImage,
  children,
  isPlatformAdmin = false,
  pendingApproval = false,
}: Props) {
  return (
    <PanelShell
      brandIcon={<Building2 className="w-5 h-5" aria-hidden />}
      brandName={exchange.name}
      brandSub={exchange.city ?? 'صرافی'}
      navItems={[...NAV_ITEMS]}
      userRole={staffRole}
      userName={userName}
      userImage={userImage}
      userSub={STAFF_ROLE_FA[staffRole] ?? staffRole}
      adminBackHref={isPlatformAdmin ? '/dashboard/exchanges' : undefined}
      topbarExtra={
        <div className={s.topbarInfo}>
          <span className={s.topbarExchange}>{exchange.name}</span>
          <span className={s.topbarStatus} data-status={exchange.status}>
            {exchange.status === 'ACTIVE' ? '● فعال' : '○ غیرفعال'}
          </span>
        </div>
      }
      pendingNode={
        pendingApproval ? (
          <div className={s.pendingBanner} role="status" aria-live="polite">
            <div className={s.pendingIcon} aria-hidden>
              <Building2 className="w-10 h-10" />
            </div>
            <h1 className={s.pendingTitle}>صرافی در انتظار تأیید</h1>
            <p className={s.pendingDesc}>
              درخواست ثبت صرافی <strong>{exchange.name}</strong> دریافت شد و در صف بررسی است. پس از
              تأیید توسط تیم پلتفرم، دسترسی کامل به پنل فعال می‌شود.
            </p>
            <p className={s.pendingHint}>
              معمولاً این فرآیند ۱ تا ۲ روز کاری طول می‌کشد. در صورت نیاز به پیگیری با پشتیبانی تماس
              بگیرید.
            </p>
          </div>
        ) : undefined
      }
    >
      {children}
    </PanelShell>
  );
}
