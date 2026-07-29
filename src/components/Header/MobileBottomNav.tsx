'use client';

/**
 * MobileBottomNav (Client) — فقط رفتار scroll-hide اینجا کلاینت است.
 * داده‌های isLoggedIn از سرور می‌آیند (هیچ فلیکر login↔logout در SSR).
 *
 * الگو: Server Component layout → auth() → <MobileBottomNav isLoggedIn={…} />
 *
 * امکانات:
 *  - Floating glass pill (نه full-width bar)
 *  - Hide-on-scroll-down با rAF debounce
 *  - Safe-area inset (env(safe-area-inset-bottom))
 *  - Mount fade-in
 *  - Hide خودکار روی /auth/* و مسیرهای متمرکز
 *  - Active state با morphing pill (brand color)
 *  - prefers-reduced-motion
 *  - RTL (logical props)
 */

import {
  usePathname,
  useRouter,
} from 'next/navigation';
import {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  HiOutlineHome,
  HiOutlineNewspaper,
  HiOutlineUserCircle,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';
import { LuWallet } from 'react-icons/lu';
import s from './MobileBottomNav.module.css';

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: FC<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>;
  primary?: boolean;
  matchPrefixes?: string[];
}

const HIDE_PREFIXES = [
  '/auth',
  '/signin',
  '/signup',
  '/verify-email',
  '/verify-request',
  '/forgot-password',
  '/reset-password',
  '/maintenance',
  '/offline',
  '/session-expired',
  '/exchange-suspended',
  '/setup',
];

interface Props {
  isLoggedIn: boolean;
}

const MobileBottomNav: FC<Props> = ({ isLoggedIn }) => {
  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  const items: NavItem[] = useMemo(
    () => [
      {
        id: 'home',
        href: '/',
        label: 'خانه',
        icon: HiOutlineHome,
        matchPrefixes: ['/'],
      },
      {
        id: 'market',
        href: '/exchanges',
        label: 'بازار',
        icon: HiOutlineNewspaper,
        matchPrefixes: [
          '/exchanges',
          '/exchange-rates',
          '/money-transfer',
          '/online-payment',
        ],
      },
      {
        id: 'search',
        href: '/search',
        label: 'جستجو',
        icon: HiOutlineMagnifyingGlass,
        matchPrefixes: ['/search'],
      },
      {
        id: 'wallet',
        href: isLoggedIn ? '/dashboard/wallet' : '/wallet',
        label: 'کیف پول',
        icon: LuWallet,
        primary: true,
        matchPrefixes: [
          '/wallet',
          '/dashboard/wallet',
          '/beneficiaries',
        ],
      },
      {
        id: 'profile',
        href: isLoggedIn ? '/dashboard' : '/auth',
        label: isLoggedIn ? 'پروفایل' : 'ورود',
        icon: HiOutlineUserCircle,
        matchPrefixes: [
          '/dashboard',
          '/auth',
          '/customer',
          '/exchange',
        ],
      },
    ],
    [isLoggedIn],
  );

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
      const nearBottom =
        window.innerHeight + y >= document.body.offsetHeight - 80;
      if (atTop || nearBottom) {
        setVisible(true);
      } else if (delta > 6) {
        setVisible(false);
      } else if (delta < -6) {
        setVisible(true);
      }
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
    return HIDE_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
  }, [pathname]);

  const activeId = useMemo(() => {
    if (!pathname) return 'home';
    for (const item of items) {
      if (item.href === pathname) return item.id;
      if (
        item.matchPrefixes?.some(
          (p) => pathname === p || pathname.startsWith(`${p}/`),
        )
      ) {
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
      aria-label="ناوبری سریع موبایل"
      dir="rtl"
    >
      <ul className={s.list} role="list">
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
                  {isActive && item.primary && (
                    <span className={s.dot} aria-hidden />
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

export default MobileBottomNav;
