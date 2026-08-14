'use client';

/**
 * Header — 2026 Editorial Top Bar (persistent dashboard chrome).
 *
 * Responsive 3-zone editorial bar that morphs into a full-width search row
 * on mobile. The header carries `data-mode` to drive the visual transition
 * between default and search states without re-mounting the subtree.
 *
 *   ┌─ ≥640px (default) ────────────────────────────────────────────────────┐
 *   │ [≡] [عنوان · chip]    [⌘K search field]    [🟢time][🔔][☾][A]        │
 *   └───────────────────────────────────────────────────────────────────────┘
 *   ┌─ <640px (default) ────────────────────────────────────────────────────┐
 *   │ [≡] [عنوان صفحه]      [🔍][🔔][☾][A]                                │
 *   └───────────────────────────────────────────────────────────────────────┘
 *   ┌─ <640px (search mode) ────────────────────────────────────────────────┐
 *   │ [←]       [جستجو…]                                    [×]            │
 *   └───────────────────────────────────────────────────────────────────────┘
 *
 * Design language (Linear × Resend × Stripe):
 *   • Glass surface with a hairline gradient border, scroll-aware shadow.
 *   • Live Tehran clock pulse — at-a-glance operational awareness (≥768px).
 *   • Search field uses `field-sizing: content` on desktop; collapses to a
 *     magnifier icon trigger on mobile that morphs the row into search mode.
 *   • Avatar with name + role chip (visible from ≥1024px).
 *   • Notifications popover uses Radix for free focus management + ESC.
 *   • Theme switcher is the existing `SwitchDarkMode` primitive.
 *   • Mobile menu trigger mirrors the sidebar hamburger state.
 *   • Mobile page-context title is sourced from `BreadcrumbContext` so
 *     sub-pages (پست‌ها، کاربران، گزارش‌ها، …) reflect where the user is.
 *
 * The component owns NO business logic — it only reads from the existing
 * `useSidebarStore`, `useCurrentUser`, `useBreadcrumb`, and dispatches the
 * global `cmd-palette:open` event for the search field.
 *
 * portal prop — scopes eyebrow label, notification link, and admin-only
 * dropdown items so each product area shows only what belongs to it.
 */

import {
  type NotificationRow,
  getNotifications,
  markAllNotificationsRead,
} from '@/actions/notification-actions';
import { useSignOut } from '@/components/Auth/useSignOut';
import Avatar from '@/components/Avatar/Avatar';
import SwitchDarkMode from '@/components/SwitchDarkMode/SwitchDarkMode';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSidebarStore } from '@/hooks/sidebarStore';
import { useBreadcrumb } from '@/hooks/useBreadcrumb';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { AnimatePresence, motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineBars3,
  HiOutlineBell,
  HiOutlineChartBarSquare,
  HiOutlineCheckCircle,
  HiOutlineCog6Tooth,
  HiOutlineDocumentText,
  HiOutlineExclamationCircle,
  HiOutlineMagnifyingGlass,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineUserCircle,
  HiOutlineUsers,
  HiOutlineXMark,
} from 'react-icons/hi2';

const getRoleBadge = (role?: string) => {
  switch (role) {
    case 'OWNER':
      return { label: 'مالک', tone: 'rose', accent: 'var(--ds-accent-rose, var(--ds-brand-600))' };
    case 'SUPERADMIN':
      return {
        label: 'سوپرادمین',
        tone: 'rose',
        accent: 'var(--ds-accent-rose, var(--ds-brand-600))',
      };
    case 'ADMIN':
      return {
        label: 'مدیر',
        tone: 'violet',
        accent: 'var(--ds-accent-violet, var(--ds-brand-600))',
      };
    case 'AUTHOR':
      return {
        label: 'نویسنده',
        tone: 'amber',
        accent: 'var(--ds-accent-amber, var(--ds-brand-600))',
      };
    case 'SUPPORT':
      return {
        label: 'پشتیبانی',
        tone: 'sky',
        accent: 'var(--ds-accent-cyan, var(--ds-brand-600))',
      };
    case 'CUSTOMER':
    case 'TEST_CUSTOMER':
      return {
        label: 'مشتری',
        tone: 'emerald',
        accent: 'var(--ds-accent-emerald, var(--ds-brand-600))',
      };
    case 'MERCHANT':
      return {
        label: 'پذیرنده',
        tone: 'cyan',
        accent: 'var(--ds-accent-cyan, var(--ds-brand-600))',
      };
    case 'EXCHANGE':
      return { label: 'صرافی', tone: 'indigo', accent: 'var(--ds-brand-600)' };
    default:
      return { label: 'کاربر', tone: 'slate', accent: 'var(--ds-text-secondary)' };
  }
};

/** Per-portal eyebrow label shown next to the breadcrumb chip on desktop. */
const PORTAL_EYEBROW: Record<'admin' | 'customer' | 'exchange', string> = {
  admin: 'داشبورد',
  customer: 'پورتال مشتری',
  exchange: 'پنل صرافی',
};

/** Per-portal profile/settings/reports links in the user dropdown. */
const PORTAL_PROFILE_HREF: Record<'admin' | 'customer' | 'exchange', string> = {
  admin: '/dashboard/edit-profile',
  customer: '/customer/profile',
  exchange: '/exchange/profile',
};

const PORTAL_SETTINGS_HREF: Record<'admin' | 'customer' | 'exchange', string> = {
  admin: '/dashboard/settings',
  customer: '/customer/settings',
  exchange: '/exchange/settings',
};

/** Notification "view all" link — scoped per portal. */
const PORTAL_NOTIF_HREF: Record<'admin' | 'customer' | 'exchange', string> = {
  admin: '/dashboard/notifications',
  customer: '/customer/notifications',
  exchange: '/exchange/dashboard',
};

/** Map NotificationRow.isRead → visual tone */
function rowToTone(n: NotificationRow): 'ok' | 'info' | 'warn' | 'urgent' {
  if (!n.isRead) return 'info';
  return 'ok';
}

const TONE_ACCENT: Record<'ok' | 'info' | 'warn' | 'urgent', string> = {
  ok: 'bg-[color:var(--ds-accent-emerald,_var(--ds-brand-500))]/15 text-[color:var(--ds-accent-emerald,_var(--ds-brand-600))] dark:bg-[color:var(--ds-accent-emerald,_var(--ds-brand-500))]/20 dark:text-[color:var(--ds-accent-emerald,_var(--ds-brand-400,_var(--ds-brand-500)))]',
  info: 'bg-[color:var(--ds-brand-500)]/10 text-[color:var(--ds-brand-600)] dark:bg-[color:var(--ds-brand-500)]/20 dark:text-[color:var(--ds-brand-400,_var(--ds-brand-500))]',
  warn: 'bg-[color:var(--ds-accent-amber)]/15 text-[color:var(--ds-accent-amber)] dark:bg-[color:var(--ds-accent-amber)]/20 dark:text-[color:var(--ds-accent-amber)]',
  urgent:
    'bg-[color:var(--ds-accent-rose)]/15 text-[color:var(--ds-accent-rose)] dark:bg-[color:var(--ds-accent-rose)]/20 dark:text-[color:var(--ds-accent-rose)]',
};

const TONE_ICON: Record<'ok' | 'info' | 'warn' | 'urgent', React.ReactNode> = {
  ok: <HiOutlineCheckCircle className="w-4 h-4" />,
  info: <HiOutlineDocumentText className="w-4 h-4" />,
  warn: <HiOutlineExclamationCircle className="w-4 h-4" />,
  urgent: <HiOutlineExclamationCircle className="w-4 h-4" />,
};

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

function formatTehran(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

interface HeaderProps {
  /**
   * Portal discriminant — drives eyebrow text, notification links, and which
   * admin-only dropdown items are shown. Defaults to 'admin' for backwards
   * compatibility with any consumer that has not yet been updated.
   */
  portal?: 'admin' | 'customer' | 'exchange';
}

const Header: React.FC<HeaderProps> = ({ portal = 'admin' }) => {
  const user = useCurrentUser();
  const { isOpen, setIsOpen, isMobile } = useSidebarStore();
  const { items: breadcrumbItems } = useBreadcrumb();

  const roleBadge = getRoleBadge(user?.role);

  // Real notifications from DB — loaded once on mount, refreshed every 60s
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let interval: number | null = null;

    const load = async () => {
      setNotifLoading(true);
      const rows = await getNotifications({ limit: 20 });
      if (!cancelled) {
        setNotifications(rows);
        setNotifLoading(false);
      }
    };

    const start = () => {
      if (!interval) interval = window.setInterval(() => void load(), 60_000);
    };
    const stop = () => {
      if (interval) {
        window.clearInterval(interval);
        interval = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        void load();
        start();
      }
    };

    void load();
    start();

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    // Optimistically update local state
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Live Tehran clock — cheap single setState per minute.
  const [clock, setClock] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setClock(formatTehran(new Date()));
    tick();
    const t = window.setInterval(tick, 30_000);
    return () => window.clearInterval(t);
  }, []);

  // Quick search — dispatches cmd-palette:open in the admin portal, where
  // UniversalCommandPalette (rendered by the dashboard layout) listens and
  // opens. In customer/exchange portals the field is a visual hint only.
  const [query, setQuery] = useState('');
  const openCommandPalette = () => {
    if (portal !== 'admin') return;
    window.dispatchEvent(new CustomEvent('cmd-palette:open'));
  };

  // Mobile-only "morph into search" mode. Default: false. Tapping the
  // magnifier icon in zone 3 sets it to true; tapping × (or pressing Esc)
  // returns to the default compact row.
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Silent-focus protocol — lets keyboard shortcuts (e.g. `g k`) and the
  // mobile search-morph auto-focus the search input WITHOUT opening the
  // command palette. The flag is set synchronously, consumed in `onFocus`,
  // then cleared on the next animation frame to leave manual clicks
  // (which should still open the palette) untouched.
  const silentFocusRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      const el = searchInputRef.current;
      if (!el) return;
      silentFocusRef.current = true;
      el.focus();
      el.select();
      window.requestAnimationFrame(() => {
        silentFocusRef.current = false;
      });
    };
    window.addEventListener('cmd-search:focus-silently', handler);
    return () => window.removeEventListener('cmd-search:focus-silently', handler);
  }, []);

  // When search mode opens, auto-focus the input + lock body scroll so
  // users stay anchored to the morph. Goes through the silent-focus
  // event so the command palette does NOT open on top — on mobile, the
  // input itself is the primary surface, and the palette is a redundant
  // overlay. Power users can still press `Mod+K` to summon the palette.
  useEffect(() => {
    if (!isSearching) return;
    const t = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('cmd-search:focus-silently'));
    }, 60);
    return () => window.clearTimeout(t);
  }, [isSearching]);

  // Auto-collapse the search row if the user resizes into desktop width
  // (≥640px) — the desktop layout already shows the search field, so the
  // mobile morph becomes redundant.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 640px)');
    const handle = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setIsSearching(false);
    };
    handle(mql);
    mql.addEventListener('change', handle);
    return () => mql.removeEventListener('change', handle);
  }, []);

  // Scroll-aware shell — observe a sentinel inside the header so the bar
  // picks up a subtle shadow + reduced opacity once the user scrolls.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const { signOut: signOutUser } = useSignOut();
  const handleLogout = () => {
    // 2026-08-14: قبلاً فقط action را صدا می‌زد و هیچ navigation/توست نداشت
    // (کامنت «server action redirect می‌کند» نادرست بود — با redirect:false
    // اجرا می‌شود) → دکمه عملاً مرده بود. حالا از مسیر یکپارچه خروج.
    void signOutUser();
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Mobile page-context title — falls back to "داشبورد" when no breadcrumb
  // is set by the page below. Uses the last breadcrumb item (the leaf) so
  // sub-pages (پست‌ها، کاربران، گزارش‌ها…) reflect where the user is.
  const mobileTitle =
    breadcrumbItems.length > 0 ? breadcrumbItems[breadcrumbItems.length - 1].label : 'داشبورد';

  const headerMode: 'default' | 'search' = isMobile && isSearching ? 'search' : 'default';

  // The sidebar is a flex child (not fixed), so the header needs no margin
  // offset — the flex layout handles spacing automatically.
  return (
    <header
      data-scrolled={scrolled ? 'true' : undefined}
      data-mode={headerMode}
      className="dash-header"
    >
      <div className="dash-header__inner">
        {/* ── Zone 1 — context (mobile menu + page-context eyebrow) ──────── */}
        <div className="dash-header__zone dash-header__zone--start">
          {/* Mobile menu trigger — mirrors the sidebar hamburger */}
          {isMobile && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'بستن منو' : 'باز کردن منو'}
              aria-expanded={isOpen}
              className="dash-header__iconbtn"
            >
              <HiOutlineBars3 className="w-[18px] h-[18px]" aria-hidden />
            </button>
          )}

          {/* Desktop page-context eyebrow (≥640px). Decorative only
              (aria-hidden) so screen readers do not hear the literal
              "داشبورد" twice. Mobile shows the same info via the
              `__mobile-title` element instead. */}
          <span className="dash-header__eyebrow" aria-hidden>
            <span className="dash-header__eyebrow-dot" />
            <span className="dash-header__eyebrow-text">{PORTAL_EYEBROW[portal]}</span>
          </span>

          {/* Mobile page-context title (<640px). Sourced from the
              BreadcrumbContext so sub-pages show their own label. */}
          <span className="dash-header__mobile-title">{mobileTitle}</span>
        </div>

        {/* ── Zone 2 — search (fluid center, hidden on mobile by default) ── */}
        <div className="dash-header__zone dash-header__zone--search">
          <label className="dash-header__search" htmlFor="dash-header-search">
            <HiOutlineMagnifyingGlass className="w-4 h-4 opacity-60 shrink-0" aria-hidden />
            <input
              id="dash-header-search"
              ref={searchInputRef}
              type="search"
              inputMode="search"
              placeholder="جستجو در داشبورد…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  if (query) {
                    setQuery('');
                  } else if (isSearching) {
                    setIsSearching(false);
                  }
                  return;
                }
                if (e.key === 'Enter' && query.trim()) {
                  openCommandPalette();
                  setQuery('');
                  setIsSearching(false);
                }
              }}
              onFocus={() => {
                if (silentFocusRef.current) return;
                if (portal === 'admin') openCommandPalette();
              }}
              className="dash-header__search-input"
              aria-label="جستجو در داشبورد"
            />
            {/* Mobile-only close button — visible only when the search row
                is morphed open on mobile (CSS hides it on wider screens and
                while in the compact row). */}
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setIsSearching(false);
              }}
              aria-label="بستن جستجو"
              className="dash-header__search-close"
            >
              <HiOutlineXMark className="w-4 h-4" aria-hidden />
            </button>
          </label>
        </div>

        {/* ── Zone 3 — actions (end, RTL: left) ──────────────────────────── */}
        <div className="dash-header__zone dash-header__zone--end">
          {/* Mobile search trigger — opens the morph (visible <640px only,
              CSS hides it on wider screens and during search mode). */}
          <button
            type="button"
            onClick={() => setIsSearching(true)}
            aria-label="جستجو"
            className="dash-header__iconbtn dash-header__search-trigger"
          >
            <HiOutlineMagnifyingGlass className="w-[18px] h-[18px]" aria-hidden />
          </button>

          {/* Live Tehran clock pill */}
          <div
            className="dash-header__status"
            aria-live="polite"
            aria-label={`ساعت تهران ${clock ?? 'در حال بارگذاری'}`}
          >
            <span className="dash-header__status-dot" aria-hidden />
            <span className="dash-header__status-time tabular-nums">{clock ?? '--:--'}</span>
            <span className="dash-header__status-city">تهران</span>
          </div>

          {/* Notifications popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`اعلان‌ها (${unreadCount.toLocaleString('fa-IR')} مورد خوانده‌نشده)`}
                className="dash-header__iconbtn dash-header__iconbtn--badge"
              >
                <HiOutlineBell className="w-[15px] h-[15px]" aria-hidden />
                {unreadCount > 0 && (
                  <span className="dash-header__iconbtn-badge" aria-hidden>
                    <span>{unreadCount > 9 ? '۹+' : unreadCount.toLocaleString('fa-IR')}</span>
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={10}
              className="dash-header__popover w-[22rem] p-0"
            >
              <header className="dash-header__popover-head">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-[color:var(--ds-text-primary)]">اعلان‌ها</p>
                    <p className="text-[11px] text-[color:var(--ds-text-muted)] mt-0.5">
                      آخرین رویدادهای داشبورد
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleMarkAllRead()}
                    className="text-[11px] font-semibold text-[color:var(--ds-brand-600)] hover:text-[color:var(--ds-brand-700)] dark:text-[color:var(--ds-brand-400,_var(--ds-brand-500))] hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ds-brand-500)]/60 px-1"
                  >
                    علامت همه خوانده‌شده
                  </button>
                </div>
              </header>

              {notifLoading ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm text-[color:var(--ds-text-muted)]">در حال بارگذاری…</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm text-[color:var(--ds-text-muted)]">اعلان تازه‌ای ندارید.</p>
                </div>
              ) : (
                <ul className="max-h-96 overflow-y-auto py-1">
                  <AnimatePresence initial={false}>
                    {notifications.map((n, i) => {
                      const tone = rowToTone(n);
                      return (
                        <motion.li
                          key={n.id}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          transition={{
                            duration: 0.25,
                            delay: i * 0.03,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          <Link
                            href={PORTAL_NOTIF_HREF[portal]}
                            className="dash-header__notif group"
                          >
                            <span
                              className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                TONE_ACCENT[tone],
                              )}
                              aria-hidden
                            >
                              {TONE_ICON[tone]}
                            </span>
                            <span className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[color:var(--ds-text-primary)] truncate">
                                {n.message}
                              </p>
                              <p className="text-[11px] text-[color:var(--ds-text-muted)] mt-1">
                                {n.time}
                              </p>
                            </span>
                          </Link>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}

              <footer className="dash-header__popover-foot">
                <Link
                  href={PORTAL_NOTIF_HREF[portal]}
                  className="text-xs font-semibold text-[color:var(--ds-brand-600)] hover:text-[color:var(--ds-brand-700)] dark:text-[color:var(--ds-brand-400,_var(--ds-brand-500))] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ds-brand-500)]/60 px-1"
                >
                  مشاهده همه اعلان‌ها
                </Link>
              </footer>
            </PopoverContent>
          </Popover>

          {/* Theme switcher */}
          <div className="transition-transform duration-200 ease-[var(--ds-ease-spring)]">
            <SwitchDarkMode />
          </div>

          {/* User dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="منوی کاربر" className="dash-header__avatar">
                <div className="dash-header__avatar-inner">
                  <span className="dash-header__avatar-name">{user?.name || 'کاربر'}</span>
                  <span className="dash-header__avatar-role">
                    <HiOutlineSparkles className="w-3 h-3 opacity-80" aria-hidden />
                    <span>{roleBadge.label}</span>
                  </span>
                </div>
                <div className="relative shrink-0">
                  <Avatar
                    imgUrl={user?.profile?.avatar}
                    userName={user?.name}
                    sizeClass="h-9 w-9"
                    containerClassName="rounded-xl ring-2 ring-white/40 dark:ring-white/15 transition-all duration-200 group-hover:ring-violet-400/60"
                  />
                  <span className="dash-header__avatar-dot" aria-hidden />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={10} className="min-w-[260px] p-2">
              <div className="flex items-center gap-3 px-2 py-2.5 rounded-lg bg-white/75 dark:bg-[--nova-surface-2]/50 border-[0.5px] border-white/90 dark:border-white/10 mb-1">
                <div
                  className="p-2.5 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${roleBadge.accent}, color-mix(in oklch, ${roleBadge.accent} 70%, var(--ds-text-primary)))`,
                  }}
                >
                  <HiOutlineShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div className="text-start min-w-0 flex-1">
                  <p className="text-xs text-[color:var(--ds-text-muted)]">سطح دسترسی</p>
                  <p className="text-sm font-bold text-[color:var(--ds-text-primary)] truncate mt-0.5">
                    {roleBadge.label}
                  </p>
                  {user?.email && (
                    <p className="text-[11px] text-[color:var(--ds-text-muted)] truncate mt-0.5">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-[color:var(--ds-text-muted)] px-2 pt-2">
                حساب
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={PORTAL_PROFILE_HREF[portal]} className="flex items-center gap-3 w-full">
                  <HiOutlineUserCircle className="w-4 h-4" aria-hidden />
                  <span>مشاهده پروفایل</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={PORTAL_SETTINGS_HREF[portal]}
                  className="flex items-center gap-3 w-full"
                >
                  <HiOutlineCog6Tooth className="w-4 h-4" aria-hidden />
                  <span>تنظیمات</span>
                </Link>
              </DropdownMenuItem>
              {/* Reports link — only meaningful in admin portal */}
              {portal === 'admin' && (
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/reports" className="flex items-center gap-3 w-full">
                    <HiOutlineChartBarSquare className="w-4 h-4" aria-hidden />
                    <span>گزارش‌ها</span>
                  </Link>
                </DropdownMenuItem>
              )}
              {/* Users management — admin portal only, for ADMIN/OWNER roles */}
              {portal === 'admin' &&
                (user?.role === 'ADMIN' ||
                  user?.role === 'OWNER' ||
                  user?.role === 'SUPERADMIN') && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/users" className="flex items-center gap-3 w-full">
                      <HiOutlineUsers className="w-4 h-4" aria-hidden />
                      <span>مدیریت کاربران</span>
                    </Link>
                  </DropdownMenuItem>
                )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  void handleLogout();
                }}
                className="text-[color:var(--ds-accent-rose)] dark:text-[color:var(--ds-accent-rose)] focus:text-[color:var(--ds-accent-rose)]"
              >
                <HiOutlineArrowRightOnRectangle className="w-4 h-4" aria-hidden />
                <span>خروج</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Hairline divider below the header — visible always, brighter on scroll */}
      <span aria-hidden className="dash-header__divider" />
    </header>
  );
};

export default Header;
