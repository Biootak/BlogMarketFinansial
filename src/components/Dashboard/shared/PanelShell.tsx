'use client';

/**
 * PanelShell — layout مشترک برای همه پنل‌های سایت.
 *
 * هم ExchangeShell و هم CustomerShell از این component استفاده می‌کنند.
 * تمام منطق sidebar + overlay + topbar + responsive اینجاست.
 *
 * ── Props ──────────────────────────────────────────────────────────────────
 *  brandIcon        — icon داخل brand block
 *  brandName        — نام اصلی (صرافی / پورتال)
 *  brandSub         — زیرنویس (شهر / نقش)
 *  navItems         — لیست آیتم‌های navigation
 *  userName / userImage — کاربر جاری
 *  userSub          — زیرنویس کاربر (نقش / شماره)
 *  topbarExtra      — slot اضافه در topbar (badge اعلان، وضعیت صرافی و…)
 *  adminBackHref    — اگر set باشه لینک بازگشت ادمین نمایش داده میشه
 *  sidebarExtra     — slot اضافه در sidebar (KYC badge، pending banner و…)
 *  pendingNode      — اگر set باشه محتوای اصلی مخفی و این نمایش داده میشه
 */

import { logout } from '@/actions/auth-actions';
import { ChevronLeft, LogOut, Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import s from './PanelShell.module.css';

export interface PanelNavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  /** اگر تعریف شده → فقط این نقش‌ها می‌بینند */
  roles?: readonly string[];
  /** badge عددی (مثل تعداد اعلان خوانده‌نشده) */
  badge?: number;
}

export interface PanelShellProps {
  /** icon داخل brand block */
  brandIcon: ReactNode;
  brandName: string;
  brandSub?: string;

  /** آیتم‌های منو */
  navItems: PanelNavItem[];
  /** نقش کاربر برای فیلتر navItems.roles */
  userRole?: string;

  /** اطلاعات کاربر */
  userName: string;
  userImage?: string | null;
  /** زیرنویس کاربر (نقش / شماره تلفن) */
  userSub?: string;

  /** slot اضافه بالای nav (KYC badge و …) */
  sidebarExtra?: ReactNode;
  /** slot اضافه توپبار (notification dot، وضعیت صرافی و …) */
  topbarExtra?: ReactNode;

  /** href لینک بازگشت به داشبورد ادمین */
  adminBackHref?: string;

  /** اگر set باشه به جای children نمایش داده میشه */
  pendingNode?: ReactNode;

  children: ReactNode;
}

export default function PanelShell({
  brandIcon,
  brandName,
  brandSub,
  navItems,
  userRole,
  userName,
  userImage,
  userSub,
  sidebarExtra,
  topbarExtra,
  adminBackHref,
  pendingNode,
  children,
}: PanelShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleItems = navItems.filter(
    (item) => !item.roles || !userRole || item.roles.includes(userRole),
  );

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className={s.root}>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className={s.overlay}
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
          role="presentation"
          aria-hidden
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className={`${s.sidebar} ${sidebarOpen ? s.sidebarOpen : ''}`} aria-label="ناوبری">
        {/* Brand */}
        <div className={s.brand}>
          <div className={s.brandIcon}>{brandIcon}</div>
          <div className={s.brandText}>
            <span className={s.brandName}>{brandName}</span>
            {brandSub && <span className={s.brandSub}>{brandSub}</span>}
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

        {/* لینک بازگشت ادمین */}
        {adminBackHref && (
          <Link href={adminBackHref} className={s.adminBackLink} title="بازگشت به داشبورد ادمین">
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden />
            <span>داشبورد ادمین</span>
          </Link>
        )}

        {/* Slot اضافه (KYC badge، pending hint و …) */}
        {sidebarExtra}

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
                    {item.badge != null && item.badge > 0 && (
                      <span className={s.navBadge} aria-label={`${item.badge} مورد جدید`}>
                        {item.badge > 9 ? '۹+' : new Intl.NumberFormat('fa-IR').format(item.badge)}
                      </span>
                    )}
                    {isActive && <ChevronLeft className="w-3 h-3 ms-auto opacity-50" aria-hidden />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User card */}
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
            {userSub && <span className={s.userSub}>{userSub}</span>}
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

      {/* ── Main ───────────────────────────────────────────────────────────── */}
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
          {topbarExtra && <div className={s.topbarExtra}>{topbarExtra}</div>}
        </header>

        {/* Page */}
        <div className={s.page}>{pendingNode ?? children}</div>
      </div>
    </div>
  );
}
