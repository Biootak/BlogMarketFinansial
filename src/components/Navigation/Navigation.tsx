'use client';

/**
 * Navigation (desktop) — linear.app × stripe.com
 *
 * Improvements vs. previous version:
 *  - linear.app-style animated hover pill (shared `layoutId`).
 *  - stripe.com-style dropdown panel reveal (origin top, scale + fade).
 *  - Sub-items appear with a 30ms stagger for that "cascading" feel.
 *  - All timing primitives live in `@/lib/motion` so we can tune in one place.
 *  - Respects `prefers-reduced-motion` via `useReducedMotion`.
 *
 * Performance:
 *  - The static link list is still rendered server-side via the parent
 *    server component (`MainNav`). Only this interactive shell is client.
 *  - `memo` keeps the component from re-rendering when siblings change.
 *  - The `NAVBAR_LINKS` array is module-scoped → no allocation per render.
 */

import { memo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import {
  STRIPE_EASE,
  STRIPE_EASE_SOFT,
  dropdownPanel,
  staggerContainer,
  staggerItem,
} from '@/lib/motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

const Navigation = ({ className = 'flex' }: NavigationProps): React.ReactElement => {
  const pathname = usePathname();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const isActive = (item: NavItem) => {
    if (pathname === item.href) return true;
    if (item.subItems) {
      return item.subItems.some((subItem) => pathname.startsWith(subItem.href));
    }
    return false;
  };

  // Tuned variants for sub-items. We honour reduced-motion at the call site.
  const subItemVariants = prefersReducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : staggerItem;

  const panelVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 1, y: 0, scale: 1 },
        visible: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 1, y: 0, scale: 1 },
      }
    : dropdownPanel;

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
                  ${active
                    ? 'text-[rgb(var(--c-foreground))]'
                    : 'text-[rgb(var(--c-neutral-400))] hover:text-[rgb(var(--c-foreground))]'
                  }
                `}
              >
              {/* linear.app-style animated pill background */}
              {showPill && (
                <motion.span
                  layoutId="nav-hover-pill"
                  aria-hidden
                  className="
                    absolute inset-0 rounded-full
                    bg-[rgb(var(--c-surface-elevated))]
                    border border-[rgb(var(--c-border-subtle))]
                    shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]
                  "
                  transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.8 }}
                />
              )}

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

          <AnimatePresence>
            {activeId === item.id && (
              <DropdownMenuContent
                forceMount
                align="start"
                sideOffset={10}
                className="
                  z-[60] min-w-[220px] p-1.5
                  bg-[rgb(var(--c-surface-overlay))]/95
                  backdrop-blur-2xl backdrop-saturate-150
                  border border-[rgb(var(--c-border-subtle))]
                  rounded-2xl
                  shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.02)_inset]
                "
              >
                <motion.div
                  variants={panelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <motion.ul
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col gap-0.5"
                  >
                    {item.subItems.map((subItem) => {
                      const isSubActive = pathname === subItem.href;
                      return (
                        <motion.li key={subItem.id} variants={subItemVariants}>
                          <DropdownMenuItem asChild>
                            <Link
                              href={subItem.href}
                              className={`
                                group/sub relative flex items-center gap-3
                                py-2.5 px-3 text-sm rounded-xl
                                transition-colors duration-200 cursor-pointer
                                ${isSubActive
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
                        </motion.li>
                      );
                    })}
                  </motion.ul>
                </motion.div>
              </DropdownMenuContent>
            )}
          </AnimatePresence>
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
        {showPill && (
          <motion.span
            layoutId="nav-hover-pill"
            aria-hidden
            className="
              absolute inset-0 rounded-full
              bg-[rgb(var(--c-surface-elevated))]
              border border-[rgb(var(--c-border-subtle))]
              shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]
            "
            transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.8 }}
          />
        )}
        <Link
          href={item.href}
          className={`
            relative z-10 inline-flex items-center px-3.5 py-2 text-sm font-medium
            rounded-full outline-none whitespace-nowrap
            transition-colors duration-200
            ${active
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
    <nav className="flex items-center justify-center" aria-label="ناوبری اصلی">
      <ul className={`items-center ${className} gap-1 flex`}>{NAVBAR_LINKS.map(renderNavItem)}</ul>
    </nav>
  );
};

export default memo(Navigation);

// Re-export ease constants so the parent server file can read them if needed.
export { STRIPE_EASE, STRIPE_EASE_SOFT };
