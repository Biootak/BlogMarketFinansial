'use client';

import { logout } from '@/actions/auth-actions';
import Avatar from '@/components/Avatar/Avatar';
import Logo from '@/components/Logo/Logo';
import { useToast } from '@/components/ui/use-toast';
import { useSidebarStore } from '@/hooks/sidebarStore';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineChartBarSquare,
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineCommandLine,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineHome,
  HiOutlineMegaphone,
  HiOutlineSquares2X2,
  HiOutlineUserCircle,
  HiOutlineUsers,
  HiOutlineXMark,
} from 'react-icons/hi2';

/* --------------------------------------------------------------------------
   Dashboard Sidebar — 2026 "Aurora Dock" redesign
   --------------------------------------------------------------------------
   Premium, spatial navigation chrome. Key UX ideas from Linear/Resend/Raycast:

   • Grouped sections with micro-labels for information hierarchy.
   • A sliding "spotlight" pill behind the active item (CSS variables updated
     from measured DOM positions). No magic numbers; no per-frame JS.
   • Magnetic hover micro-interactions (CSS transform on :hover).
   • Icon-only rail mode with scale-and-reveal hover labels.
   • Real keyboard shortcuts (1-9, S, R, P) mapped to visible badges.
   • Aurora ambient light at the top edge (very subtle, GPU-only).
   • Glass surface with hairline border; respects light/dark and RTL.
   -------------------------------------------------------------------------- */

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
  label?: string;
  items: MenuItem[];
}

const ROLE_LABEL: Record<UserRole, string> = {
  OWNER: 'مالک',
  ADMIN: 'مدیر',
  AUTHOR: 'نویسنده',
  USER: 'کاربر',
};

const ROLE_TONE: Record<UserRole, string> = {
  OWNER: 'bg-gradient-to-br from-rose-500 to-pink-600',
  ADMIN: 'bg-gradient-to-br from-violet-500 to-purple-600',
  AUTHOR: 'bg-gradient-to-br from-amber-500 to-orange-500',
  USER: 'bg-gradient-to-br from-slate-500 to-gray-600',
};

/* Badge shown next to the label; the actual handler maps these keys. */
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
        { id: 'main', items: [dashboard] },
        { id: 'content', label: 'محتوا', items: [posts, categories] },
        {
          id: 'operations',
          label: 'عملیات',
          items: [exchangeRates, advertisements, serviceRequests],
        },
        { id: 'admin', label: 'مدیریت', items: [users, reports, settings] },
        { id: 'account', label: 'حساب', items: [profile] },
      ];
    case 'ADMIN':
      return [
        { id: 'main', items: [dashboard] },
        { id: 'content', label: 'محتوا', items: [posts, categories] },
        {
          id: 'operations',
          label: 'عملیات',
          items: [exchangeRates, advertisements, serviceRequests],
        },
        { id: 'admin', label: 'مدیریت', items: [users] },
        { id: 'account', label: 'حساب', items: [profile] },
      ];
    case 'AUTHOR':
      return [
        { id: 'main', items: [dashboard] },
        { id: 'content', label: 'محتوا', items: [posts, categories] },
        { id: 'account', label: 'حساب', items: [profile] },
      ];
    default:
      return [];
  }
}

interface SpotlightState {
  top: number;
  height: number;
  opacity: number;
}

interface NavItemProps {
  item: MenuItem;
  isOpen: boolean;
  isActive: boolean;
  expandedItems: string[];
  setExpandedItems: React.Dispatch<React.SetStateAction<string[]>>;
  onItemRender: (id: string, el: HTMLElement | null) => void;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({
  item,
  isOpen,
  isActive,
  expandedItems,
  setExpandedItems,
  onItemRender,
  onClick,
}) => {
  const pathname = usePathname();
  const isExpanded = expandedItems.includes(item.id);
  const itemRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);

  useEffect(() => {
    onItemRender(item.id, itemRef.current);
  }, [item.id, onItemRender]);

  if (item.submenu) {
    const isSubActive = item.submenu.some((s) => pathname === s.href);
    return (
      <li>
        <button
          ref={itemRef as React.RefObject<HTMLButtonElement>}
          type="button"
          className="dash-side__item"
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
                <span className="dash-side__item-label">{sub.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link
        ref={itemRef as React.RefObject<HTMLAnchorElement>}
        href={item.href}
        onClick={onClick}
        className="dash-side__item"
        data-active={isActive || undefined}
        aria-current={isActive ? 'page' : undefined}
      >
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
  const { isOpen, setIsOpen, isMobile } = useSidebarStore();
  const [expandedItems, setExpandedItems] = useState<string[]>(['exchangeRates']);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sideWidth = useMemo(() => {
    if (isMobile) return '0';
    return isOpen ? 'var(--ds-side-w-expanded)' : 'var(--ds-side-w-rail)';
  }, [isOpen, isMobile]);
  const menu = useMemo(() => getMenu(userRole), [userRole]);
  const { data: session } = useSession();
  const userInfo = session?.user;

  const [spotlight, setSpotlight] = useState<SpotlightState>({ top: 0, height: 0, opacity: 0 });
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const navRef = useRef<HTMLElement>(null);

  const isActiveRoute = useCallback(
    (href: string) => {
      if (href === '/dashboard') return pathname === href;
      return pathname.startsWith(href);
    },
    [pathname],
  );

  /* Register each nav item's DOM node so the spotlight can measure it. */
  const registerItem = useCallback((id: string, el: HTMLElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  }, []);

  /* Find which top-level item should host the spotlight. Sub-item active
     states "roll up" to their parent so the parent stays highlighted. */
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

  /* Update spotlight position when active item or sidebar width changes.
     We read layout directly because the active item is a real DOM element.
     useLayoutEffect prevents a one-frame flash.
     isOpen is required because section labels appear/disappear and shift item positions. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: isOpen changes vertical layout via section labels
  useLayoutEffect(() => {
    const nav = navRef.current;
    const activeEl = activeItemId ? itemRefs.current.get(activeItemId) : null;
    if (!nav || !activeEl) {
      setSpotlight((s) => ({ ...s, opacity: 0 }));
      return;
    }
    const navRect = nav.getBoundingClientRect();
    const itemRect = activeEl.getBoundingClientRect();
    setSpotlight({
      top: itemRect.top - navRect.top + nav.scrollTop,
      height: itemRect.height,
      opacity: 1,
    });
  }, [activeItemId, isOpen]);

  /* Keyboard shortcuts: digits 1-9 and letters mapped to top-level items.
     We ignore inputs/textareas and only act when no modifier is held. */
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

  return (
    <>
      <aside className="dash-side" data-state={dataState} aria-label="منوی داشبورد">
        <div className="dash-side__aurora" aria-hidden />

        <header className="dash-side__top">
          <div className="dash-side__brand">
            <Logo className="h-8 w-8 shrink-0 flex items-center justify-center" />
          </div>
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

        <nav ref={navRef} id="dash-side-nav" className="dash-side__nav" aria-label="ناوبری اصلی">
          <div
            className="dash-side__spotlight"
            aria-hidden
            style={
              {
                '--spotlight-top': `${spotlight.top}px`,
                '--spotlight-height': `${spotlight.height}px`,
                opacity: spotlight.opacity,
              } as React.CSSProperties
            }
          />
          <ul className="dash-side__list">
            {menu.map((section) => (
              <li key={section.id} className="dash-side__section">
                {section.label && isOpen && (
                  <span className="dash-side__section-label">{section.label}</span>
                )}
                <ul className="dash-side__section-list">
                  {section.items.map((item) => (
                    <NavItem
                      key={item.id}
                      item={item}
                      isOpen={isOpen}
                      isActive={item.id === activeItemId}
                      expandedItems={expandedItems}
                      setExpandedItems={setExpandedItems}
                      onItemRender={registerItem}
                      onClick={handleItemClick}
                    />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        <footer className="dash-side__foot">
          {isOpen ? (
            <div className="dash-side__user-card">
              <div className="relative shrink-0">
                <Avatar
                  imgUrl={userInfo?.image}
                  userName={userInfo?.name}
                  sizeClass="h-9 w-9"
                  containerClassName="rounded-xl ring-2 ring-white/40 dark:ring-white/15"
                />
                <span
                  className={cn(
                    'dash-side__user-role-dot absolute -bottom-0.5 -start-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--ds-color-side)]',
                    ROLE_TONE[userRole],
                  )}
                  aria-hidden
                />
              </div>
              <div className="dash-side__user-meta">
                <p className="dash-side__user-name">{userInfo?.name || 'کاربر'}</p>
                <p className="dash-side__user-email">{userInfo?.email}</p>
                <span className="dash-side__user-role">{ROLE_LABEL[userRole]}</span>
              </div>
            </div>
          ) : (
            <div className="dash-side__user-card dash-side__user-card--rail">
              <div className="relative">
                <Avatar
                  imgUrl={userInfo?.image}
                  userName={userInfo?.name}
                  sizeClass="h-9 w-9"
                  containerClassName="rounded-xl"
                />
                <span
                  className={cn(
                    'absolute -bottom-0.5 -start-0.5 h-3 w-3 rounded-full border-2 border-[var(--ds-color-side)]',
                    ROLE_TONE[userRole],
                  )}
                  aria-hidden
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="dash-side__item dash-side__logout"
            aria-label="خروج از حساب"
          >
            <span className="dash-side__item-ico">
              <HiOutlineArrowRightOnRectangle className="w-[18px] h-[18px]" aria-hidden />
            </span>
            {isOpen && <span className="dash-side__item-label">خروج</span>}
          </button>
        </footer>

        {mounted &&
          !isMobile &&
          createPortal(
            <button
              type="button"
              className="dash-side__pill"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'بستن منو' : 'باز کردن منو'}
              aria-expanded={isOpen}
              aria-controls="dash-side-nav"
              data-open={isOpen}
              style={{ right: `calc(${sideWidth} - 14px)` }}
            >
              <HiOutlineChevronLeft className="w-4 h-4" aria-hidden />
            </button>,
            document.body,
          )}
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
