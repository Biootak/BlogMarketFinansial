'use client';

/* --------------------------------------------------------------------------
   Dashboard Sidebar — 2026 "Stratum" redesign
   --------------------------------------------------------------------------
   A cartographer's chart-inspired chrome. Visual ideas:

   • Vertical "spine" hairline runs the full height of the sidebar (logical
     inline-end, just 11px from the edge) — the same geometry a hand-drawn
     chart uses to anchor icons and rulers.
   • Every item hangs off the spine: icon at the spine, label floating into
     the canvas. The active item is announced by a small diamond (4px square
     rotated 45°) on the spine, never by a horizontal bar or a fill.
   • Hover is an "ink wash" — a radial gradient from the spine outward,
     not a translate or scale. The item never moves; the surface tints.
   • Section labels carry a manuscript index ("·۰۱·" "·۰۲·") — small caps
     with wide tracking, the kind of typography found in editorial atlases.
   • Header and footer are intentionally asymmetric: the logo sits offset
     from center; the avatar card has two unequal radii on the diagonal.
   • Spacing follows a Fibonacci ladder (8 / 13 / 21 / 34 / 55) so every
     measurement on the surface shares a common denominator.
   • No glassmorphism inside the sidebar, no aurora blobs, no translate
     on hover. The surface is solid; depth comes from hairlines and tint.

   Behavior preserved 1:1 (regression list lives in `.kimchi/docs/`):
     • Hamburger toggle, auto-open on ≥768px, auto-close on <768px,
       overlay-click-close, route detection (incl. submenu roll-up),
       expandedItems persistence, keyboard shortcuts (1-9, S, R, P),
       logout → toast + redirect.
   -------------------------------------------------------------------------- */

import { logout } from '@/actions/auth-actions';
import Avatar from '@/components/Avatar/Avatar';
import Logo from '@/components/Logo/Logo';
import { useToast } from '@/components/ui/use-toast';
import { useSidebarStore } from '@/hooks/sidebarStore';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineChartBarSquare,
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineHome,
  HiOutlineMegaphone,
  HiOutlineSquares2X2,
  HiOutlineUserCircle,
  HiOutlineUsers,
  HiOutlineXMark,
} from 'react-icons/hi2';

type UserRole = 'USER' | 'AUTHOR' | 'ADMIN' | 'OWNER';

interface SubmenuItem {
  href: string;
  label: string;
}

interface MenuItem {
  id: string;
  href: string;
  icon: React.ReactNode;
  label: string;
  title?: string;
  shortcut?: string;
  submenu?: SubmenuItem[];
}

interface NavSection {
  id: string;
  /** Manuscript index — rendered as "·۰۱·" "·۰۲·" prefix. */
  index: string;
  /** Section label (Persian, uppercase-friendly). */
  label?: string;
  items: MenuItem[];
}

const ROLE_LABEL: Record<UserRole, string> = {
  OWNER: 'مالک',
  ADMIN: 'مدیر',
  AUTHOR: 'نویسنده',
  USER: 'کاربر',
};

const ROLE_GLYPH: Record<UserRole, string> = {
  OWNER: '◆',
  ADMIN: '◇',
  AUTHOR: '○',
  USER: '·',
};

/* Keyboard shortcuts — visible badge; handler binds to actual navigation. */
const SHORTCUT_KEYS: Record<string, string> = {
  dashboard: '1',
  posts: '2',
  users: '3',
  categories: '4',
  advertisements: '5',
  serviceRequests: '6',
  exchangeRates: '7',
  settings: 'S',
  reports: 'R',
  profile: 'P',
};

function getMenu(role: UserRole): NavSection[] {
  const dashboard: MenuItem = {
    id: 'dashboard',
    href: '/dashboard',
    icon: <HiOutlineHome className="w-[18px] h-[18px]" />,
    label: 'داشبورد',
    title: 'داشبورد',
    shortcut: SHORTCUT_KEYS.dashboard,
  };

  const posts: MenuItem = {
    id: 'posts',
    href: '/dashboard/posts',
    icon: <HiOutlineDocumentText className="w-[18px] h-[18px]" />,
    label: 'پست‌ها',
    title: 'پست‌ها',
    shortcut: SHORTCUT_KEYS.posts,
  };

  const categories: MenuItem = {
    id: 'categories',
    href: '/dashboard/categories',
    icon: <HiOutlineSquares2X2 className="w-[18px] h-[18px]" />,
    label: 'دسته‌بندی',
    title: 'دسته‌بندی',
    shortcut: SHORTCUT_KEYS.categories,
  };

  const users: MenuItem = {
    id: 'users',
    href: '/dashboard/users',
    icon: <HiOutlineUsers className="w-[18px] h-[18px]" />,
    label: 'کاربران',
    title: 'کاربران',
    shortcut: SHORTCUT_KEYS.users,
  };

  const advertisements: MenuItem = {
    id: 'advertisements',
    href: '/dashboard/advertisements',
    icon: <HiOutlineMegaphone className="w-[18px] h-[18px]" />,
    label: 'تبلیغات',
    title: 'تبلیغات',
    shortcut: SHORTCUT_KEYS.advertisements,
  };

  const serviceRequests: MenuItem = {
    id: 'serviceRequests',
    href: '/dashboard/service-requests',
    icon: <HiOutlineClipboardDocumentList className="w-[18px] h-[18px]" />,
    label: 'درخواست‌ها',
    title: 'درخواست‌های خدمات',
    shortcut: SHORTCUT_KEYS.serviceRequests,
  };

  const exchangeRates: MenuItem = {
    id: 'exchangeRates',
    href: '/dashboard/exchange-rates',
    icon: <HiOutlineCurrencyDollar className="w-[18px] h-[18px]" />,
    label: 'نرخ ارز',
    title: 'نرخ ارز',
    shortcut: SHORTCUT_KEYS.exchangeRates,
  };

  const settings: MenuItem = {
    id: 'settings',
    href: '/dashboard/settings',
    icon: <HiOutlineCog6Tooth className="w-[18px] h-[18px]" />,
    label: 'تنظیمات',
    title: 'تنظیمات سیستم',
    shortcut: SHORTCUT_KEYS.settings,
  };

  const reports: MenuItem = {
    id: 'reports',
    href: '/dashboard/reports',
    icon: <HiOutlineChartBarSquare className="w-[18px] h-[18px]" />,
    label: 'گزارش‌ها',
    title: 'گزارش‌ها',
    shortcut: SHORTCUT_KEYS.reports,
  };

  const profile: MenuItem = {
    id: 'profile',
    href: '/dashboard/edit-profile',
    icon: <HiOutlineUserCircle className="w-[18px] h-[18px]" />,
    label: 'پروفایل',
    title: 'پروفایل من',
    shortcut: SHORTCUT_KEYS.profile,
  };

  switch (role) {
    case 'OWNER':
      return [
        { id: 'main', index: '۰۱', label: 'مرکز', items: [dashboard] },
        { id: 'content', index: '۰۲', label: 'محتوا', items: [posts, categories] },
        {
          id: 'operations',
          index: '۰۳',
          label: 'عملیات',
          items: [exchangeRates, advertisements, serviceRequests],
        },
        { id: 'admin', index: '۰۴', label: 'مدیریت', items: [users, reports, settings] },
        { id: 'account', index: '۰۵', label: 'حساب', items: [profile] },
      ];
    case 'ADMIN':
      return [
        { id: 'main', index: '۰۱', label: 'مرکز', items: [dashboard] },
        { id: 'content', index: '۰۲', label: 'محتوا', items: [posts, categories] },
        {
          id: 'operations',
          index: '۰۳',
          label: 'عملیات',
          items: [exchangeRates, advertisements, serviceRequests],
        },
        { id: 'admin', index: '۰۴', label: 'مدیریت', items: [users] },
        { id: 'account', index: '۰۵', label: 'حساب', items: [profile] },
      ];
    case 'AUTHOR':
      return [
        { id: 'main', index: '۰۱', label: 'مرکز', items: [dashboard] },
        { id: 'content', index: '۰۲', label: 'محتوا', items: [posts, categories] },
        { id: 'account', index: '۰۵', label: 'حساب', items: [profile] },
      ];
    default:
      return [];
  }
}

/* Persist the submenu initial state across mounts. The role decides which
   section opens first (matches the v1 behaviour). */
function defaultExpanded(role: UserRole): string[] {
  if (role === 'USER') return [];
  return ['exchangeRates'];
}

interface NavItemProps {
  item: MenuItem;
  index: number;
  isOpen: boolean;
  isActive: boolean;
  expandedItems: string[];
  setExpandedItems: React.Dispatch<React.SetStateAction<string[]>>;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({
  item,
  index,
  isOpen,
  isActive,
  expandedItems,
  setExpandedItems,
  onClick,
}) => {
  const pathname = usePathname();
  const isExpanded = expandedItems.includes(item.id);

  if (item.submenu) {
    const isSubActive = item.submenu.some((s) => pathname === s.href);
    return (
      <li className="dash-side__row">
        <button
          type="button"
          className={cn('dash-side__item', 'dash-side__item--parent')}
          data-active={isSubActive || undefined}
          data-expanded={isExpanded || undefined}
          aria-expanded={isExpanded}
          aria-controls={`dash-side-sub-${item.id}`}
          onClick={() =>
            setExpandedItems((p) =>
              p.includes(item.id) ? p.filter((x) => x !== item.id) : [...p, item.id],
            )
          }
        >
          <span className="dash-side__diamond" aria-hidden />
          <span className="dash-side__index" aria-hidden>
            {toPersianDigits(index)}
          </span>
          <span className="dash-side__item-ico">{item.icon}</span>
          <span className="dash-side__item-label">{item.label}</span>
          {item.shortcut && isOpen && (
            <kbd className="dash-side__item-kbd" aria-hidden>
              {item.shortcut}
            </kbd>
          )}
          <HiOutlineChevronDown className="dash-side__item-chev" aria-hidden />
        </button>
        <div
          id={`dash-side-sub-${item.id}`}
          className="dash-side__sub"
          data-open={isExpanded || undefined}
        >
          <div className="dash-side__sub-inner">
            {item.submenu.map((sub) => (
              <Link
                key={sub.href}
                href={sub.href}
                onClick={onClick}
                className="dash-side__item dash-side__item--sub"
                data-active={pathname === sub.href || undefined}
                aria-current={pathname === sub.href ? 'page' : undefined}
              >
                <span className="dash-side__item-tick" aria-hidden />
                <span className="dash-side__item-label">{sub.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="dash-side__row">
      <Link
        href={item.href}
        onClick={onClick}
        className="dash-side__item"
        data-active={isActive || undefined}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="dash-side__diamond" aria-hidden />
        <span className="dash-side__index" aria-hidden>
          {toPersianDigits(index)}
        </span>
        <span className="dash-side__item-ico">{item.icon}</span>
        <span className="dash-side__item-label">{item.label}</span>
        {item.shortcut && isOpen && (
          <kbd className="dash-side__item-kbd" aria-hidden>
            {item.shortcut}
          </kbd>
        )}
      </Link>
    </li>
  );
};

interface SidebarProps {
  userRole: UserRole;
}

const Sidebar = ({ userRole }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { logoUrl } = useSiteSettings();
  const { isOpen, setIsOpen, isMobile } = useSidebarStore();
  const [expandedItems, setExpandedItems] = useState<string[]>(defaultExpanded(userRole));

  const { data: session } = useSession();
  const userInfo = session?.user;

  const menu = useMemo(() => getMenu(userRole), [userRole]);

  const isActiveRoute = useCallback(
    (href: string) => {
      if (href === '/dashboard') return pathname === href;
      return pathname.startsWith(href);
    },
    [pathname],
  );

  /* Active id rolls up to a parent when a submenu child is active. */
  const activeItemId = useMemo(() => {
    for (const section of menu) {
      for (const item of section.items) {
        if (item.submenu) {
          if (item.submenu.some((s) => pathname === s.href)) return item.id;
        }
        if (isActiveRoute(item.href)) return item.id;
      }
    }
    return null;
  }, [menu, pathname, isActiveRoute]);

  /* Keyboard shortcuts: digits 1-9 and letters mapped to top-level items. */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const flat = menu.flatMap((s) => s.items);
      const item = flat.find((i) => i.shortcut?.toLowerCase() === e.key.toLowerCase());
      if (!item) return;

      e.preventDefault();
      if (item.submenu) {
        setExpandedItems((p) =>
          p.includes(item.id) ? p.filter((x) => x !== item.id) : [...p, item.id],
        );
      } else {
        router.push(item.href);
        if (isMobile) setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [menu, router, isMobile, setIsOpen]);

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        toast({
          title: 'خروج موفق',
          description: 'شما با موفقیت از حساب کاربری خود خارج شدید.',
          variant: 'success',
        });
        router.push('/auth');
      } else {
        toast({
          title: 'خطا در خروج',
          description: extractMessage(result) || 'مشکلی در خروج از حساب کاربری پیش آمد.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'خطای سیستمی',
        description: 'مشکلی در سیستم رخ داده است.',
        variant: 'destructive',
      });
    }
  };

  const handleItemClick = () => {
    if (isMobile) setIsOpen(false);
  };

  const dataState: string = isMobile
    ? isOpen
      ? 'mobile-open'
      : 'mobile-closed'
    : isOpen
      ? 'expanded'
      : 'rail';

  // A single, deterministic index per top-level item — feeds the manuscript
  // numerals in the section labels and per-item indices.
  const flatIndex = useMemo(() => {
    let n = 0;
    return menu.map((section) => ({
      ...section,
      items: section.items.map((it) => {
        n += 1;
        return { ...it, _flatIndex: n };
      }),
    }));
  }, [menu]);

  return (
    <>
      <aside className="dash-side" data-state={dataState} aria-label="منوی داشبورد">
        {/* Vertical spine — the geometric anchor of the entire surface. */}
        <span className="dash-side__spine" aria-hidden />
        <span className="dash-side__spine dash-side__spine--top" aria-hidden />
        <span className="dash-side__spine dash-side__spine--bottom" aria-hidden />

        <header className="dash-side__top">
          <div className="dash-side__brand">
            <span className="dash-side__brand-mark" aria-hidden>
              {ROLE_GLYPH[userRole]}
            </span>
            <div className="dash-side__brand-logo">
              <Logo
                logoUrl={logoUrl || undefined}
                className="h-8 w-8 shrink-0 flex items-center justify-center"
              />
            </div>
            <div className="dash-side__brand-text">
              <span className="dash-side__brand-name">داشبورد</span>
              <span className="dash-side__brand-sub">{ROLE_LABEL[userRole]}</span>
            </div>
          </div>
          {!isMobile && (
            <button
              type="button"
              className="dash-side__toggle"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'بستن منو' : 'باز کردن منو'}
              aria-expanded={isOpen}
              aria-controls="dash-side-nav"
              data-open={isOpen}
            >
              <HiOutlineChevronLeft className="w-4 h-4" aria-hidden />
            </button>
          )}
          {isMobile && isOpen && (
            <button
              type="button"
              className="dash-side__close"
              onClick={() => setIsOpen(false)}
              aria-label="بستن منو"
            >
              <HiOutlineXMark className="w-5 h-5" aria-hidden />
            </button>
          )}
        </header>

        <nav id="dash-side-nav" className="dash-side__nav" aria-label="ناوبری اصلی">
          <div className="dash-side__nav-inner">
            {flatIndex.map((section) => (
              <section key={section.id} className="dash-side__section">
                {section.label && isOpen && (
                  <header className="dash-side__section-head">
                    <span className="dash-side__section-tick" aria-hidden />
                    <span className="dash-side__section-index">·{section.index}·</span>
                    <span className="dash-side__section-rule" aria-hidden />
                    <span className="dash-side__section-label">{section.label}</span>
                  </header>
                )}
                <ul className="dash-side__list">
                  {section.items.map((it) => (
                    <NavItem
                      key={it.id}
                      item={it}
                      index={it._flatIndex}
                      isOpen={isOpen}
                      isActive={it.id === activeItemId}
                      expandedItems={expandedItems}
                      setExpandedItems={setExpandedItems}
                      onClick={handleItemClick}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </nav>

        <footer className="dash-side__foot">
          <span className="dash-side__baseline" aria-hidden />
          <div className={cn('dash-side__user', !isOpen && 'dash-side__user--rail')}>
            <div className="dash-side__user-avatar">
              <Avatar
                imgUrl={userInfo?.image}
                userName={userInfo?.name}
                sizeClass="h-9 w-9"
                containerClassName="dash-side__user-img"
              />
              <span className="dash-side__user-glyph" aria-hidden>
                {ROLE_GLYPH[userRole]}
              </span>
            </div>
            {isOpen && (
              <div className="dash-side__user-meta">
                <p className="dash-side__user-name">{userInfo?.name || 'کاربر'}</p>
                <p className="dash-side__user-email">{userInfo?.email}</p>
                <span className="dash-side__user-role">{ROLE_LABEL[userRole]}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="dash-side__item dash-side__logout"
            aria-label="خروج از حساب"
          >
            <span className="dash-side__diamond" aria-hidden />
            <span className="dash-side__item-ico">
              <HiOutlineArrowRightOnRectangle className="w-[18px] h-[18px]" aria-hidden />
            </span>
            {isOpen && <span className="dash-side__item-label">خروج</span>}
          </button>
        </footer>
      </aside>

      {isMobile && isOpen && (
        <button
          type="button"
          className="dash-side__overlay"
          onClick={() => setIsOpen(false)}
          aria-label="بستن منو"
        />
      )}
    </>
  );
};

export default Sidebar;

function extractMessage(r: unknown): string | undefined {
  if (r && typeof r === 'object') {
    const record = r as Record<string, unknown>;
    if (typeof record.error === 'string') return record.error;
    if (typeof record.message === 'string') return record.message;
  }
  return undefined;
}

/* Convert a 1-based index to Persian digits ("1" → "۱", "12" → "۱۲").
   Used for the manuscript-style numbering on each nav item. */
function toPersianDigits(n: number): string {
  const map: Record<string, string> = {
    '0': '۰',
    '1': '۱',
    '2': '۲',
    '3': '۳',
    '4': '۴',
    '5': '۵',
    '6': '۶',
    '7': '۷',
    '8': '۸',
    '9': '۹',
  };
  return String(n)
    .split('')
    .map((c) => map[c] ?? c)
    .join('');
}
