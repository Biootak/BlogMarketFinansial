'use client';

/**
 * ExchangeShell — shell کامل پنل صراف.
 *
 * Sidebar با navigation + header + محتوا.
 * RTL، logical properties، dark mode.
 */

import { logout } from '@/actions/auth-actions';
import type { ExchangeRow } from '@/actions/exchanges';
import {
  BarChart3,
  Building2,
  ChevronLeft,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Tag,
  Users,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import s from './ExchangeShell.module.css';

interface Props {
  exchange: ExchangeRow;
  staffRole: string;
  /** permissions در آینده برای fine-grained access control استفاده می‌شوند */
  permissions: string[];
  userName: string;
  userImage: string | null;
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/exchange/dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/exchange/quotes', label: 'قیمت‌گذاری', icon: Tag },
  { href: '/exchange/customers', label: 'مشتریان', icon: Users },
  { href: '/exchange/transactions', label: 'تراکنش‌ها', icon: CircleDollarSign },
  { href: '/exchange/rates', label: 'نرخ‌ها', icon: BarChart3 },
  { href: '/exchange/staff', label: 'کارمندان', icon: Building2, roles: ['OWNER', 'MANAGER'] },
  { href: '/exchange/reports', label: 'گزارش‌ها', icon: FileText },
  { href: '/exchange/settlement', label: 'تسویه‌حساب', icon: Receipt, roles: ['OWNER', 'MANAGER'] },
  { href: '/exchange/settings', label: 'تنظیمات', icon: Settings, roles: ['OWNER', 'MANAGER'] },
];

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'مالک صرافی',
  MANAGER: 'مدیر',
  STAFF: 'کارمند',
  VIEWER: 'مشاهده‌گر',
};

export default function ExchangeShell({
  exchange,
  staffRole,
  permissions: _permissions,
  userName,
  userImage,
  children,
}: Props) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(staffRole));

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className={s.root}>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className={s.overlay}
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
          role="presentation"
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${s.sidebar} ${sidebarOpen ? s.sidebarOpen : ''}`}
        aria-label="ناوبری پنل صرافی"
      >
        {/* Brand */}
        <div className={s.brand}>
          <div className={s.brandIcon}>
            <Building2 className="w-5 h-5" aria-hidden />
          </div>
          <div className={s.brandText}>
            <span className={s.brandName}>{exchange.name}</span>
            <span className={s.brandCity}>{exchange.city ?? 'صرافی'}</span>
          </div>
          <button
            type="button"
            className={s.brandClose}
            onClick={() => setSidebarOpen(false)}
            aria-label="بستن منو"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className={s.nav} aria-label="منو">
          <ul className={s.navList}>
            {visibleItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`${s.navItem}${isActive ? ` ${s.navItemActive}` : ''}`}
                    onClick={() => setSidebarOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon className="w-[18px] h-[18px]" aria-hidden />
                    <span>{item.label}</span>
                    {isActive && <ChevronLeft className="w-3 h-3 ms-auto opacity-50" aria-hidden />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User footer */}
        <div className={s.userCard}>
          <div className={s.userAvatar}>
            {userImage ? (
              <Image
                src={userImage}
                alt={userName}
                width={36}
                height={36}
                className={s.userAvatarImg}
              />
            ) : (
              <span className={s.userAvatarFallback}>{userName.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className={s.userInfo}>
            <span className={s.userName}>{userName}</span>
            <span className={s.userRole}>{ROLE_LABEL[staffRole] ?? staffRole}</span>
          </div>
          <button
            type="button"
            className={s.logoutBtn}
            onClick={handleLogout}
            title="خروج از حساب"
            aria-label="خروج از حساب"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={s.main}>
        {/* Topbar */}
        <header className={s.topbar}>
          <button
            type="button"
            className={s.menuBtn}
            onClick={() => setSidebarOpen(true)}
            aria-label="باز کردن منو"
            aria-expanded={sidebarOpen}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className={s.topbarInfo}>
            <span className={s.topbarExchange}>{exchange.name}</span>
            <span className={s.topbarStatus} data-status={exchange.status}>
              {exchange.status === 'ACTIVE' ? '● فعال' : '○ غیرفعال'}
            </span>
          </div>
        </header>

        {/* Page */}
        <div className={s.page}>{children}</div>
      </div>
    </div>
  );
}
