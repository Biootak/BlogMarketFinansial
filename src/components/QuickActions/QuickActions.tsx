'use client';

/**
 * QuickActions — Desktop floating action button (2026).
 *
 * Signature pattern (Linear × Vercel × Coinbase):
 *  - Single FAB (Floating Action Button) bottom-right
 *  - Tap to expand radial menu (Wallet / KYC / Support)
 *  - Spring-easing scale + rotation
 *  - Glassmorphism surface, brand gradient
 *  - Hidden on mobile (the bottom nav is primary there)
 *  - Hidden on /auth/* (focus management)
 *  - Persists user dismiss in localStorage (5 min)
 *  - Reduced-motion: just fades, no rotation
 */

import {
  HiOutlineSparkles,
  HiOutlineXMark,
  HiOutlineChatBubbleLeftRight,
  HiOutlineShieldCheck,
  HiOutlineQuestionMarkCircle,
} from 'react-icons/hi2';
import { LuWallet } from 'react-icons/lu';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import s from './QuickActions.module.css';

interface ActionItem {
  id: string;
  label: string;
  icon: FC<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>;
  href: string;
  badge?: 'new' | 'hot' | null;
}

interface Props {
  isLoggedIn: boolean;
  userRole?: string;
}

const HIDE_PREFIXES = [
  '/auth',
  '/signin',
  '/signup',
  '/verify-email',
  '/verify-request',
  '/forgot-password',
  '/reset-password',
  '/setup',
  '/maintenance',
  '/offline',
];

const QuickActions: FC<Props> = ({ isLoggedIn, userRole }) => {
  const { logoUrl } = useSiteSettings();
  const pathname = usePathname();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const items: ActionItem[] = useMemo(() => {
    const list: ActionItem[] = [
      {
        id: 'wallet',
        label: isLoggedIn ? 'کیف پول' : 'شروع کنید',
        icon: LuWallet,
        href: isLoggedIn ? '/dashboard/wallet' : '/auth',
        badge: isLoggedIn ? null : 'new',
      },
    ];
    if (isLoggedIn) {
      list.push({
        id: 'kyc',
        label: 'احراز هویت',
        icon: HiOutlineShieldCheck,
        href: '/customer/kyc',
      });
    }
    list.push({
      id: 'support',
      label: 'پشتیبانی',
      icon: HiOutlineChatBubbleLeftRight,
      href: '/support',
    });
    list.push({
      id: 'help',
      label: 'راهنما',
      icon: HiOutlineQuestionMarkCircle,
      href: '/help-center',
    });
    return list;
  }, [isLoggedIn]);

  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 100);
    return () => window.clearTimeout(t);
  }, []);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const shouldHide = useMemo(() => {
    if (!pathname) return false;
    if (HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return true;
    }
    return false;
  }, [pathname]);

  const handleItemClick = useCallback(
    (href: string) => {
      setOpen(false);
      if (pathname !== href) router.push(href);
    },
    [pathname, router],
  );

  if (shouldHide) return null;

  return (
    <div
      ref={containerRef}
      className={s.container}
      data-open={open}
      data-mounted={mounted}
      aria-hidden={!open && !mounted}
    >
      {/* Radial menu — rendered above the FAB so reverse-order appears on top */}
      <ul className={s.menu} role="menu" aria-label="اقدامات سریع">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <li
              key={item.id}
              className={s.menuItem}
              style={{ ['--qa-i' as string]: i } as React.CSSProperties}
            >
              <button
                type="button"
                className={s.menuBtn}
                onClick={() => handleItemClick(item.href)}
                role="menuitem"
                tabIndex={open ? 0 : -1}
              >
                <span className={s.menuIcon} aria-hidden>
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <span className={s.menuLabel}>{item.label}</span>
                {item.badge && (
                  <span className={s.menuBadge} data-kind={item.badge}>
                    {item.badge === 'new' ? 'جدید' : 'مهم'}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* FAB trigger */}
      <button
        type="button"
        className={s.fab}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'بستن منوی اقدامات' : 'باز کردن اقدامات سریع'}
        title="اقدامات سریع"
      >
        <span className={s.fabIcon} data-open={open}>
          {open ? (
            <HiOutlineXMark size={20} strokeWidth={2} />
          ) : logoUrl ? (
            <Image
              src={logoUrl}
              alt="لوگو"
              width={28}
              height={28}
              className={s.fabLogo}
              unoptimized
            />
          ) : (
            <HiOutlineSparkles size={20} strokeWidth={2} />
          )}
        </span>
        <span className={s.fabPulse} aria-hidden />
      </button>
    </div>
  );
};

export default QuickActions;
