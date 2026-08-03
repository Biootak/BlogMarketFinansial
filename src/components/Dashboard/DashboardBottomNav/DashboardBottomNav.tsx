'use client';

/**
 * DashboardBottomNav — Mobile bottom nav for the authenticated dashboard.
 *
 * 5 destinations tuned for the role of the user:
 *  - Home (dashboard)
 *  - Posts / Customers / Wallet — role-aware primary action
 *  - Reports (or settings fallback)
 *  - Notifications
 *  - Profile
 *
 * Server-side `auth()` decides the user role; this component receives
 * `role` as a prop and resolves the primary item accordingly.
 *
 * Same design language as the public MobileBottomNav: floating glass pill,
 * hide-on-scroll, safe-area inset, RTL.
 */

import s from '@/components/Header/MobileBottomNav.module.css';
import { usePathname, useRouter } from 'next/navigation';
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HiOutlineBell,
  HiOutlineDocumentText,
  HiOutlineHome,
  HiOutlineShieldCheck,
  HiOutlineUserCircle,
  HiOutlineUsers,
  HiOutlineWallet,
} from 'react-icons/hi2';

type Role =
  | 'USER'
  | 'AUTHOR'
  | 'SUPPORT'
  | 'ADMIN'
  | 'OWNER'
  | 'SUPERADMIN'
  | 'CUSTOMER'
  | 'TEST_CUSTOMER'
  | 'MERCHANT'
  | 'EXCHANGE';

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: FC<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>;
  primary?: boolean;
  matchPrefixes?: string[];
}

const HIDE_PREFIXES = ['/auth', '/signin', '/signup', '/verify-email', '/forgot-password'];

interface Props {
  role?: Role | string;
  unreadCount?: number;
  /** USER only: اگر KYC هنوز تأیید نشده، primary به «احراز هویت» تغییر می‌کند */
  kycVerified?: boolean;
}

const DashboardBottomNav: FC<Props> = ({ role, unreadCount = 0, kycVerified = true }) => {
  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Resolve "primary" item based on role.
  const items: NavItem[] = useMemo(() => {
    const isAuthor =
      role === 'AUTHOR' || role === 'ADMIN' || role === 'OWNER' || role === 'SUPERADMIN';
    const isCustomer = role === 'CUSTOMER' || role === 'TEST_CUSTOMER' || role === 'MERCHANT';
    const isExchange = role === 'EXCHANGE';

    // R13-fix (2026-07-29): primary برای USER/SUPPORT/unknown → wallet به‌جای reports
    // (reports در baseDashboardRoutes نیست و USER با کلیک به /dashboard برمی‌گشت).
    const primary: NavItem = isAuthor
      ? {
          id: 'posts',
          href: '/dashboard/posts',
          label: 'پست‌ها',
          icon: HiOutlineDocumentText,
          primary: true,
          matchPrefixes: ['/dashboard/posts', '/dashboard/posts/create'],
        }
      : isCustomer
        ? {
            // FIX (2026-08-01): CUSTOMER از /dashboard بلاک است (middleware
            // DASHBOARD_BLOCKED_ROLES) — قبلاً primary به /dashboard/wallet می‌رفت
            // و middleware آن را به /customer/dashboard redirect می‌کرد (حلقهٔ UX).
            id: 'wallet',
            href: '/customer/wallet',
            label: 'کیف پول',
            icon: HiOutlineWallet,
            primary: true,
            matchPrefixes: ['/customer/wallet', '/beneficiaries'],
          }
        : isExchange
          ? {
              // FIX (2026-08-01): EXCHANGE از /dashboard بلاک است — primary به
              // پنل صرافی می‌رود نه /dashboard/customers (که redirect loop بود).
              id: 'customers',
              href: '/exchange/customers',
              label: 'مشتریان',
              icon: HiOutlineUsers,
              primary: true,
              matchPrefixes: ['/exchange/customers', '/exchange/dashboard'],
            }
          : {
              // USER / SUPPORT / unknown
              // اگر KYC تأیید نشده → primary = KYC؛ در غیر این صورت → wallet
              ...(!kycVerified
                ? {
                    id: 'kyc',
                    href: '/dashboard/kyc',
                    label: 'احراز هویت',
                    icon: HiOutlineShieldCheck,
                    primary: true,
                    matchPrefixes: ['/dashboard/kyc'],
                  }
                : {
                    id: 'wallet',
                    href: '/dashboard/wallet',
                    label: 'کیف پول',
                    icon: HiOutlineWallet,
                    primary: true,
                    matchPrefixes: ['/dashboard/wallet'],
                  }),
            };

    // FIX (2026-08-01): home/notifications/profile برای CUSTOMER و EXCHANGE باید
    // به پورتال خودشان بروند — /dashboard/* برای این نقش‌ها بلاک است (middleware)
    // و قبلاً redirect loop می‌ساخت.
    const home: NavItem = isCustomer
      ? {
          id: 'home',
          href: '/customer/dashboard',
          label: 'داشبورد',
          icon: HiOutlineHome,
          matchPrefixes: ['/customer/dashboard'],
        }
      : isExchange
        ? {
            id: 'home',
            href: '/exchange/dashboard',
            label: 'داشبورد',
            icon: HiOutlineHome,
            matchPrefixes: ['/exchange/dashboard'],
          }
        : {
            id: 'home',
            href: '/dashboard',
            label: 'داشبورد',
            icon: HiOutlineHome,
            matchPrefixes: ['/dashboard'],
          };

    const notifications: NavItem = isCustomer
      ? {
          id: 'notifications',
          href: '/customer/notifications',
          label: 'اعلان‌ها',
          icon: HiOutlineBell,
          matchPrefixes: ['/customer/notifications'],
        }
      : isExchange
        ? {
            id: 'notifications',
            href: '/exchange/dashboard',
            label: 'اعلان‌ها',
            icon: HiOutlineBell,
            matchPrefixes: ['/exchange/dashboard'],
          }
        : {
            id: 'notifications',
            href: '/dashboard/notifications',
            label: 'اعلان‌ها',
            icon: HiOutlineBell,
            matchPrefixes: ['/dashboard/notifications'],
          };

    const profile: NavItem = isCustomer
      ? {
          id: 'profile',
          href: '/customer/profile',
          label: 'پروفایل',
          icon: HiOutlineUserCircle,
          matchPrefixes: ['/customer/profile', '/customer/settings'],
        }
      : isExchange
        ? {
            id: 'profile',
            href: '/exchange/profile',
            label: 'پروفایل',
            icon: HiOutlineUserCircle,
            matchPrefixes: ['/exchange/profile', '/exchange/settings'],
          }
        : {
            id: 'profile',
            href: '/dashboard/edit-profile',
            label: 'پروفایل',
            icon: HiOutlineUserCircle,
            matchPrefixes: [
              '/dashboard/edit-profile',
              '/dashboard/settings',
              '/dashboard/security',
            ],
          };

    return [home, primary, notifications, profile];
  }, [role]);

  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastY = window.scrollY;
    let ticking = false;
    const handle = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      const atTop = y < 80;
      const nearBottom = window.innerHeight + y >= document.body.offsetHeight - 80;
      if (atTop || nearBottom) setVisible(true);
      else if (delta > 6) setVisible(false);
      else if (delta < -6) setVisible(true);
      lastY = y;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(handle);
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const shouldHide = useMemo(() => {
    if (!pathname) return false;
    return HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }, [pathname]);

  const activeId = useMemo(() => {
    if (!pathname) return 'home';
    for (const item of items) {
      if (item.href === pathname) return item.id;
      if (item.matchPrefixes?.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
        return item.id;
      }
    }
    return 'home';
  }, [pathname, items]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
      if (item.href === pathname) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      router.prefetch(item.href);
    },
    [pathname, router],
  );

  if (shouldHide) return null;

  return (
    <nav
      ref={navRef}
      className={s.nav}
      data-visible={visible}
      data-mounted={mounted}
      aria-label="ناوبری سریع داشبورد"
      dir="rtl"
    >
      <ul className={s.list}>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;
          return (
            <li key={item.id} className={s.item}>
              <a
                href={item.href}
                onClick={(e) => handleClick(e, item)}
                className={s.link}
                data-active={isActive}
                data-primary={item.primary ? 'true' : undefined}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
              >
                <span className={s.iconWrap} aria-hidden>
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.6} />
                  {isActive && item.primary && <span className={s.dot} aria-hidden />}
                  {item.id === 'notifications' && unreadCount > 0 && (
                    <span className={s.badge} aria-hidden>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </span>
                <span className={s.label}>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default DashboardBottomNav;
