'use client';

/**
 * Header — 2026 Editorial Top Bar (persistent dashboard chrome).
 *
 * Responsive 3-zone editorial bar that morphs into a full-width search row
 * on mobile. The header carries `data-mode` to drive the visual transition
 * between default and search states without re-mounting the subtree.
 *
 *   ┌─ ≥640px (default) ────────────────────────────────────────────────────┐
 *   │ [≡] [داشبورد · chip]    [⌘K search field]    [🟢time][🔔][☾][A]      │
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
 */

import { logout } from '@/actions/auth-actions';
import {
  type NotificationRow,
  getNotifications,
  markAllNotificationsRead,
} from '@/actions/notification-actions';
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
      return { label: 'مالک', color: 'from-rose-500 to-pink-600', tone: 'rose' };
    case 'ADMIN':
      return { label: 'مدیر', color: 'from-violet-500 to-purple-600', tone: 'violet' };
    case 'AUTHOR':
      return { label: 'نویسنده', color: 'from-amber-500 to-orange-500', tone: 'amber' };
    default:
      return { label: 'کاربر', color: 'from-slate-500 to-gray-600', tone: 'slate' };
  }
};

/** Map NotificationRow.isRead → visual tone */
function rowToTone(n: NotificationRow): 'ok' | 'info' | 'warn' | 'urgent' {
  if (!n.isRead) return 'info';
  return 'ok';
}

const TONE_ACCENT: Record<'ok' | 'info' | 'warn' | 'urgent', string> = {
  ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  info: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  warn: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  urgent: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
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

const Header: React.FC = () => {
  const user = useCurrentUser();
  const { isOpen, setIsOpen, isMobile } = useSidebarStore();
  const { items: breadcrumbItems } = useBreadcrumb();

  const roleBadge = getRoleBadge(user?.role);

  // Real notifications from DB — loaded once on mount, refreshed every 60s
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setNotifLoading(true);
      const rows = await getNotifications({ limit: 20 });
      if (!cancelled) {
        setNotifications(rows);
        setNotifLoading(false);
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
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

  // Quick search — mirrors the global ⌘K palette for keyboard parity.
  const [query, setQuery] = useState('');
  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('cmd-palette:open'));
  };

  // Mobile-only "morph into search" mode. Default: false. Tapping the
  // magnifier icon in zone 3 sets it to true; tapping × (or pressing Esc)
  // returns to the default compact row.
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // When search mode opens, auto-focus the input + lock body scroll so
  // users stay anchored to the morph.
  useEffect(() => {
    if (!isSearching) return;
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 60);
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

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // best-effort; the server action redirects on success
    }
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
            <span className="dash-header__eyebrow-text">داشبورد</span>
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
              onFocus={openCommandPalette}
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
                    <p className="text-sm font-bold text-slate-900 dark:text-white">اعلان‌ها</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      آخرین رویدادهای داشبورد
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleMarkAllRead()}
                    className="text-[11px] font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 px-1"
                  >
                    علامت همه خوانده‌شده
                  </button>
                </div>
              </header>

              {notifLoading ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">در حال بارگذاری…</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">اعلان تازه‌ای ندارید.</p>
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
                            href="/dashboard/notifications"
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
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                                {n.message}
                              </p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
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
                  href="/dashboard/notifications"
                  className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 px-1"
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
                <div className={cn('p-2.5 rounded-xl bg-gradient-to-br', roleBadge.color)}>
                  <HiOutlineShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div className="text-start min-w-0 flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">سطح دسترسی</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                    {roleBadge.label}
                  </p>
                  {user?.email && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 pt-2">
                حساب
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/edit-profile" className="flex items-center gap-3 w-full">
                  <HiOutlineUserCircle className="w-4 h-4" aria-hidden />
                  <span>مشاهده پروفایل</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center gap-3 w-full">
                  <HiOutlineCog6Tooth className="w-4 h-4" aria-hidden />
                  <span>تنظیمات</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/reports" className="flex items-center gap-3 w-full">
                  <HiOutlineChartBarSquare className="w-4 h-4" aria-hidden />
                  <span>گزارش‌ها</span>
                </Link>
              </DropdownMenuItem>
              {(user?.role === 'ADMIN' || user?.role === 'OWNER') && (
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
                className="text-rose-600 dark:text-rose-400 focus:text-rose-700 dark:focus:text-rose-300"
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
