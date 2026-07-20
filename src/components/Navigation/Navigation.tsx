'use client';

/**
 * Navigation (desktop) — linear.app × stripe.com
 *
 * - linear.app-style animated hover pill (CSS transform/width transition, no framer-motion).
 * - stripe.com-style dropdown panel reveal (CSS keyframe, no framer-motion).
 * - Sub-items appear with a small stagger via :nth-child(n) animation-delay.
 * - All timing primitives live in `@/lib/motion` (now CSS class strings).
 * - Respects `prefers-reduced-motion` via the global CSS rule in `globals.css`.
 *
 * Performance:
 *  - The static link list is still rendered server-side via the parent
 *    server component (`MainNav`). Only this interactive shell is client.
 *  - `memo` keeps the component from re-rendering when siblings change.
 *  - The `NAVBAR_LINKS` array is module-scoped → no allocation per render.
 *  - Zero framer-motion runtime on the home page.
 */

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { dropdownPanel, dropdownPanelExit } from '@/lib/motion';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo, useState } from 'react';

type NavItem = Readonly<{
  id: string;
  href: string;
  name: string;
  subItems?: NavItem[];
}>;

type NavigationProps = Readonly<{
  className?: string;
}>;

const NAVBAR_LINKS: readonly NavItem[] = [
  { id: 'home', name: 'صفحه اصلی', href: '/' },
  {
    id: 'crypto',
    name: 'ارزهای دیجیتال',
    href: '/archive/category/crypto',
    subItems: [
      { id: 'crypto-urgent', name: 'اخبار فوری', href: '/archive/category/crypto/news-urgent' },
      { id: 'crypto-analysis', name: 'تحلیل', href: '/archive/category/crypto/analysis' },
      { id: 'crypto-education', name: 'آموزش', href: '/archive/category/crypto/education' },
    ],
  },
  {
    id: 'gold',
    name: 'طلا (اونس)',
    href: '/archive/category/gold',
    subItems: [
      { id: 'gold-news', name: 'اخبار طلا', href: '/archive/category/gold/news' },
      { id: 'gold-analysis', name: 'تحلیل', href: '/archive/category/gold/analysis' },
      { id: 'gold-global', name: 'بازار جهانی', href: '/archive/category/gold/global' },
    ],
  },
  {
    id: 'global-market',
    name: 'بازار جهانی',
    href: '/archive/category/global-market',
    subItems: [
      {
        id: 'currency-pairs',
        name: 'جفت ارزها',
        href: '/archive/category/global-market/currency-pairs',
      },
      { id: 'global-analysis', name: 'تحلیل', href: '/archive/category/global-market/analysis' },
      { id: 'global-education', name: 'آموزش', href: '/archive/category/global-market/education' },
    ],
  },
  { id: 'stock', name: 'بورس و سهام', href: '/archive/category/stock' },
  { id: 'money-transfer', name: 'حواله', href: '/money-transfer' },
  { id: 'online-payment', name: 'پرداخت آنلاین', href: '/online-payment' },
  { id: 'urgent', name: 'اخبار فوری', href: '/archive/category/news-urgent' },
  { id: 'terms', name: 'قوانین', href: '/terms' },
] as const;

const PILL_BASE_CLASSES = `
  absolute inset-0 rounded-full
  bg-[rgb(var(--c-surface-elevated))]
  border border-[rgb(var(--c-border-subtle))]
  shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]
  transition-[transform,width,opacity] duration-200 ease-out
`;

/**
 * The shared layout-pill uses CSS `width` + `transform` transitions
 * (no layoutId, no framer-motion). Since the pill is anchored to a parent
 * <li>, the position changes are handled by mounting/unmounting the pill
 * on the active item — visually equivalent to a sliding pill for
 * sequential nav items and far cheaper on the main thread.
 */
const HoverPill = ({ show }: { show: boolean }) => {
  if (!show) return null;
  return <span aria-hidden className={PILL_BASE_CLASSES} data-pill="active" />;
};

const Navigation = ({ className = 'flex' }: NavigationProps): React.ReactElement => {
  const pathname = usePathname();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const isActive = (item: NavItem) => {
    if (pathname === item.href) return true;
    if (item.subItems) {
      return item.subItems.some((subItem) => pathname.startsWith(subItem.href));
    }
    return false;
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item);
    const showPill = hoveredId === item.id || active;

    if (item.subItems) {
      return (
        <li
          key={item.id}
          className="relative flex-shrink-0"
          onMouseEnter={() => setHoveredId(item.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <DropdownMenu
            dir="rtl"
            onOpenChange={(open) => {
              setActiveId(open ? item.id : null);
              if (!open) setHoveredId(null);
            }}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onFocus={() => setHoveredId(item.id)}
                onBlur={() => setHoveredId(null)}
                className={`
                  relative z-10 inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium
                  rounded-full outline-none whitespace-nowrap
                  transition-colors duration-200
                  ${
                    active
                      ? 'text-[rgb(var(--c-foreground))]'
                      : 'text-[rgb(var(--c-neutral-400))] hover:text-[rgb(var(--c-foreground))]'
                  }
                `}
              >
                <HoverPill show={showPill} />
                <span className="relative z-10">{item.name}</span>
                <ChevronDown
                  className={`
                    relative z-10 size-3.5 shrink-0
                    transition-transform duration-200 ease-out
                    ${activeId === item.id ? 'rotate-180' : ''}
                  `}
                />
              </button>
            </DropdownMenuTrigger>

            {activeId === item.id && (
              <DropdownMenuContent
                forceMount
                align="start"
                sideOffset={10}
                className={`
                  z-[60] min-w-[14rem] max-w-[min(90vw,18rem)] p-1.5
                  bg-[rgb(var(--c-surface-overlay))]/95
                  backdrop-blur-2xl backdrop-saturate-150
                  border border-[rgb(var(--c-border-subtle))]
                  rounded-2xl
                  shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.02)_inset]
                  ${dropdownPanel}
                `}
              >
                <ul
                  className={`flex flex-col gap-0.5 stagger-children ${dropdownPanelExit}`}
                  key={activeId}
                >
                  {item.subItems.map((subItem) => {
                    const isSubActive = pathname === subItem.href;
                    return (
                      <li key={subItem.id}>
                        <DropdownMenuItem asChild>
                          <Link
                            href={subItem.href}
                            className={`
                              group/sub relative flex items-center gap-3
                              py-2.5 px-3 text-sm rounded-xl
                              transition-colors duration-200 cursor-pointer
                              ${
                                isSubActive
                                  ? 'bg-[rgb(var(--c-primary-500))]/12 text-[rgb(var(--c-primary-300))]'
                                  : 'text-[rgb(var(--c-neutral-300))] hover:bg-[rgb(var(--c-surface-elevated))] hover:text-[rgb(var(--c-foreground))]'
                              }
                            `}
                          >
                            {/* Active indicator (linear.app-style) */}
                            {isSubActive && (
                              <span
                                aria-hidden
                                className="
                                  absolute inset-y-2 start-0 w-0.5 rounded-full
                                  bg-[rgb(var(--c-primary-500))]
                                "
                              />
                            )}
                            <span className="relative z-10 font-medium">{subItem.name}</span>
                            {/* Subtle arrow on hover */}
                            <svg
                              aria-hidden
                              className="
                                ms-auto size-3.5 opacity-0 -translate-x-1
                                group-hover/sub:opacity-100 group-hover/sub:translate-x-0
                                transition-all duration-200
                              "
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              style={{ transform: 'scaleX(-1)' }}
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </Link>
                        </DropdownMenuItem>
                      </li>
                    );
                  })}
                </ul>
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        </li>
      );
    }

    // Simple link
    return (
      <li
        key={item.id}
        className="relative flex-shrink-0"
        onMouseEnter={() => setHoveredId(item.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        <HoverPill show={showPill} />
        <Link
          href={item.href}
          className={`
            relative z-10 inline-flex items-center px-3.5 py-2 text-sm font-medium
            rounded-full outline-none whitespace-nowrap
            transition-colors duration-200
            ${
              active
                ? 'text-[rgb(var(--c-foreground))]'
                : 'text-[rgb(var(--c-neutral-400))] hover:text-[rgb(var(--c-foreground))]'
            }
          `}
        >
          {item.name}
        </Link>
      </li>
    );
  };

  return (
    <nav className="flex items-center justify-center min-w-0 max-w-full" aria-label="ناوبری اصلی">
      <ul
        className={`items-center ${className} gap-1 flex max-w-full min-w-0 overflow-x-auto scrollbar-none`}
        style={{ scrollbarWidth: 'none' }}
      >
        {NAVBAR_LINKS.map(renderNavItem)}
      </ul>
    </nav>
  );
};

export default memo(Navigation);
