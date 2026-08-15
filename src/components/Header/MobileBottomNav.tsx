'use client';

/**
 * MobileBottomNav (Client) — فقط رفتار scroll-hide اینجا کلاینت است.
 * داده‌های isLoggedIn از سرور می‌آیند (هیچ فلیکر login↔logout در SSR).
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
 *  - Long-press reorder (dnd-kit): ترتیب آیتم‌ها قابل تغییر است و در
 *    localStorage ذخیره می‌شود. long-press 500ms فعال‌سازی، tolerance 8px
 *    برای جلوگیری از فعال‌سازی تصادفی هنگام scroll. tap کوتاه همچنان
 *    navigation را فعال می‌کند.
 *
 * 2026-08-02 perf: @dnd-kit (core+sortable+utilities, ~90KB) is now split into
 * a lazy module (`MobileBottomNavSortable`) loaded only when reorder is
 * engaged, so the drag-and-drop library no longer ships on every page load.
 */

import { Briefcase, CircleUserRound, Home, Newspaper, Search, Wallet } from 'lucide-react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './MobileBottomNav.module.css';
import type { MobileBottomNavSortableProps, SortableNavItem } from './MobileBottomNavSortable';

const STORAGE_KEY = 'bmf-bottomnav-order-v1';
const LONG_PRESS_MS = 500;
const _SLOP_PX = 8;

interface NavItem extends SortableNavItem {
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

const buildItems = (loggedIn: boolean): NavItem[] => [
  {
    id: 'home',
    href: '/',
    label: 'خانه',
    icon: Home,
    matchPrefixes: ['/'],
  },
  {
    id: 'market',
    href: '/exchanges',
    label: 'بازار',
    icon: Newspaper,
    matchPrefixes: ['/exchanges', '/exchange-rates', '/money-transfer', '/online-payment'],
  },
  {
    id: 'search',
    href: '/search',
    label: 'جستجو',
    icon: Search,
    matchPrefixes: ['/search'],
  },
  {
    id: 'wallet',
    href: loggedIn ? '/dashboard/wallet' : '/wallet',
    label: 'کیف پول',
    icon: Wallet,
    primary: true,
    matchPrefixes: ['/wallet', '/dashboard/wallet', '/beneficiaries'],
  },
  // R20-fix (2026-07-29): آیتم ششم فقط در تبلت
  {
    id: 'services',
    href: '/services',
    label: 'سرویس‌ها',
    icon: Briefcase,
    tabletOnly: true,
    matchPrefixes: ['/services', '/services/compare'],
  },
  {
    id: 'profile',
    // 2026-08-09: single-step login — email + password on one page
    href: loggedIn ? '/dashboard' : '/auth?step=login',
    label: loggedIn ? 'پروفایل' : 'ورود',
    icon: CircleUserRound,
    matchPrefixes: ['/dashboard', '/auth', '/customer', '/exchange'],
  },
];

const DEFAULT_ORDER: readonly string[] = [
  'home',
  'market',
  'search',
  'wallet',
  'services',
  'profile',
];

/**
 * Lazy sortable layer — dnd-kit loads only once the user long-presses the nav
 * (reorder intent). ssr:false keeps the ~90KB chunk off the initial bundle.
 */
const MobileBottomNavSortableLazy = dynamic<MobileBottomNavSortableProps>(
  () => import('./MobileBottomNavSortable').then((m) => m.default),
  { ssr: false },
);

const MobileBottomNav: FC = () => {
  const { status } = useSession();
  // SSR always renders the logged-out template. The client must ALSO render
  // the logged-out template during hydration (useSession can resolve
  // 'authenticated' synchronously from a cached cookie, which would mismatch
  // the SSR HTML). Only after mount does the nav flip to the logged-in items.
  const [sessionReady, setSessionReady] = useState(false);
  useEffect(() => setSessionReady(true), []);
  const isLoggedIn = sessionReady && status === 'authenticated';
  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef<HTMLElement | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextClickRef = useRef(false);
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [order, setOrder] = useState<readonly string[] | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [reorderActive, setReorderActive] = useState(false);

  // Load order از localStorage پس از mount (hydration-safe)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as unknown;
        if (Array.isArray(ids) && ids.length > 0 && ids.every((id) => typeof id === 'string')) {
          setOrder(ids as string[]);
        }
      }
    } catch {
      // ignore corrupt storage
    }
    setHasHydrated(true);
  }, []);

  // ذخیره در localStorage فقط بعد از hydration (جلوگیری از overwrite در SSR)
  useEffect(() => {
    if (!hasHydrated || order === null) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    } catch {
      // storage ممکن است در حالت private/SSR در دسترس نباشد
    }
  }, [order, hasHydrated]);

  // Mount fade-in
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  // Scroll-hide با rAF debounce
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastY = window.scrollY;
    let ticking = false;

    const handle = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      const atTop = y < 80;
      const nearBottom = window.innerHeight + y >= document.body.offsetHeight - 80;
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

  // ترکیب order ذخیره‌شده با template (isLoggedIn و آیتم‌های جدید)
  const items = useMemo<NavItem[]>(() => {
    const all = buildItems(isLoggedIn);
    if (!order) return all;
    const byId = new Map(all.map((i) => [i.id, i]));
    const sorted: NavItem[] = [];
    for (const id of order) {
      const found = byId.get(id);
      if (found) {
        sorted.push(found);
        byId.delete(id);
      }
    }
    // اضافه کردن آیتم‌های جدید (که در order قبلی نبودند) به انتها
    for (const item of byId.values()) sorted.push(item);
    return sorted;
  }, [isLoggedIn, order]);

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
      // A long-press that engaged reorder must not also navigate on release.
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        e.preventDefault();
        return;
      }
      if (item.href === pathname) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      router.prefetch(item.href);
    },
    [pathname, router],
  );

  // بازنشانی به ترتیب پیش‌فرض (برای دسترسی آسان — مثلاً از DevTools)
  const resetOrder = useCallback(() => {
    setOrder(DEFAULT_ORDER);
  }, []);

  const handleReorder = useCallback((newOrder: readonly string[]) => {
    setOrder(newOrder);
  }, []);

  // Long-press the nav to enter reorder mode (loads the dnd-kit chunk).
  const handlePointerDown = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => {
      setReorderActive(true);
      suppressNextClickRef.current = true;
    }, LONG_PRESS_MS);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Exit reorder mode on route change or scroll (a drag may still be active,
  // but the pill should reset to normal navigation behaviour).
  useEffect(() => {
    if (reorderActive) setReorderActive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const renderLink: MobileBottomNavSortableProps['renderLink'] = useCallback(
    (item, { isActive }) => {
      const Icon = item.icon;
      return (
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
          </span>
          <span className={s.label}>{item.label}</span>
        </a>
      );
    },
    [handleClick],
  );

  if (shouldHide) return null;

  // backdrop-filter از طریق inline style اعمال می‌شود چون Lightning CSS آن را
  // از CSS (module و SCSS) حذف می‌کند و نتیجه شفاف/بدون بلور می‌شود.
  const glassStyle: React.CSSProperties = {
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  };

  return (
    <nav
      ref={navRef}
      className={s.nav}
      data-visible={visible}
      data-mounted={mounted}
      data-reorder={reorderActive ? 'true' : 'false'}
      aria-label="ناوبری سریع موبایل"
      dir="rtl"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {reorderActive ? (
        <MobileBottomNavSortableLazy
          items={items}
          activeId={activeId}
          order={order ?? DEFAULT_ORDER}
          onReorder={handleReorder}
          onLinkClick={handleClick}
          renderLink={renderLink}
          className={s.list}
          style={glassStyle}
          itemClassName={s.item}
          tabletOnlyClassName={s.tabletOnly}
        />
      ) : (
        <ul className={s.list} style={glassStyle}>
          {items.map((item) => (
            <li key={item.id} className={`${s.item} ${item.tabletOnly ? s.tabletOnly : ''}`.trim()}>
              {renderLink(item, { isActive: activeId === item.id })}
            </li>
          ))}
        </ul>
      )}

      {/* ابزار مخفی برای بازنشانی ترتیب — فقط در حالت توسعه قابل دسترسی
          از طریق window.__resetBottomNavOrder() در DevTools. */}
      {process.env.NODE_ENV === 'development' && (
        <button
          type="button"
          onClick={resetOrder}
          aria-label="بازنشانی ترتیب منو"
          className={s.resetButton}
          title="بازنشانی ترتیب (dev)"
        >
          ↺
        </button>
      )}
    </nav>
  );
};

export default MobileBottomNav;
