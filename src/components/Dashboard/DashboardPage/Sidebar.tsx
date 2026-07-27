'use client';

/* --------------------------------------------------------------------------
   Dashboard Sidebar — 2026 "Meridian" redesign
   --------------------------------------------------------------------------
   Harmonic asymmetric geometry — like a master painter's canvas composition.

   Design principles:
   • The toggle button is the "fulcrum" — centered vertically between nav
     and footer, creating a balanced asymmetric composition.
   • Golden-ratio proportions (1:1.618) drive the spacing rhythm.
   • Fibonacci spacing ladder: 8 / 13 / 21 / 34 px.
   • Active item: luminous pill with subtle glow (not a bar, not gradient).
   • Hover: gentle lift with icon scale — no translate, no ink-wash.
   • Surface: layered glass with depth from hairlines and subtle tint.
   • Asymmetric border-radius on user card (13px / 10px) — hand-shaped feel.
   • Brand area: geometric accent mark offset from center.

   Behavior preserved 1:1:
     • Hamburger toggle, auto-open on ≥768px, auto-close on <768px,
       overlay-click-close, route detection (incl. submenu roll-up),
       expandedItems persistence, keyboard shortcuts (1-9, S, R, P),
       logout → toast + redirect.

   Split: menu definitions → sidebar-menu.ts | NavItem → NavItem.tsx
   -------------------------------------------------------------------------- */

import { logout } from '@/actions/auth-actions';
import Avatar from '@/components/Avatar/Avatar';
import Logo from '@/components/Logo/Logo';
import { useToast } from '@/components/ui/use-toast';
import { useSidebarStore } from '@/hooks/sidebarStore';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { HiOutlineArrowRightOnRectangle, HiOutlineXMark } from 'react-icons/hi2';
import NavItem from './NavItem';
import {
  type MenuItem,
  type NavSection,
  ROLE_GLYPH,
  ROLE_LABEL,
  type UserRole,
  defaultExpanded,
  getMenu,
} from './sidebar-menu';

interface SidebarProps {
  userRole: UserRole;
  /**
   * برای صرافی‌ها: نقش staff (OWNER/MANAGER/STAFF/VIEWER).
   * برای فیلتر آیتم‌های منوی EXCHANGE.
   * برای سایر نقش‌ها نادیده گرفته می‌شود.
   */
  staffRole?: string;
}

function extractMessage(r: unknown): string | undefined {
  if (r && typeof r === 'object') {
    const record = r as Record<string, unknown>;
    if (typeof record.error === 'string') return record.error;
    if (typeof record.message === 'string') return record.message;
  }
  return undefined;
}

const Sidebar = ({ userRole, staffRole }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { logoUrl } = useSiteSettings();
  const { isOpen, setIsOpen, isMobile } = useSidebarStore();
  const [expandedItems, setExpandedItems] = useState<string[]>(defaultExpanded(userRole));

  const { data: session } = useSession();
  const userInfo = session?.user;

  // فیلتر آیتم‌ها بر اساس نقش staff (فقط برای EXCHANGE)
  const filterByRole = useCallback(
    (item: MenuItem): boolean => {
      if (userRole !== 'EXCHANGE') return true;
      if (!item.roles || item.roles.length === 0) return true;
      if (!staffRole) return false;
      return item.roles.includes(staffRole);
    },
    [userRole, staffRole],
  );

  const rawMenu = useMemo(() => getMenu(userRole), [userRole]);
  const menu = useMemo<NavSection[]>(
    () =>
      rawMenu
        .map((section) => ({
          ...section,
          items: section.items.filter(filterByRole),
        }))
        .filter((section) => section.items.length > 0),
    [rawMenu, filterByRole],
  );

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

  // A single, deterministic index per top-level item
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
        {/* Geometric accent — subtle decorative element */}
        <span className="dash-side__geo-accent" aria-hidden />

        {/* Brand area — top */}
        <header className="dash-side__top">
          <div className="dash-side__brand">
            <div className="dash-side__brand-logo">
              <Logo logoUrl={logoUrl || undefined} className="dash-side__brand-logo-img" />
            </div>
            {isOpen && (
              <div className="dash-side__brand-text">
                <span className="dash-side__brand-name">Financial Market</span>
                <span className="dash-side__brand-sub">
                  <span className="dash-side__brand-dot" aria-hidden />
                  {ROLE_LABEL[userRole]}
                </span>
              </div>
            )}
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

        {/* Navigation — scrollable */}
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
                      index={it._flatIndex ?? 0}
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

        {/* Footer — user card + logout */}
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
              <HiOutlineArrowRightOnRectangle className="w-[19px] h-[19px]" aria-hidden />
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
