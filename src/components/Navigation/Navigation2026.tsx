'use client';

/**
 * Navigation2026 — نسخه refined (Linear × Vercel)
 *
 * - حذف framer-motion: morphing underline و hover pill با CSS transition پیاده شدن.
 * - Dropdown reveal با CSS keyframe (anim-fade-in-down).
 * - Stagger داخل dropdown با :nth-child(n) animation-delay.
 * - prefers-reduced-motion توسط global rule در globals.css مدیریت میشه.
 *
 * 2026-06-16: رندر شرطی بعد از mount
 *  - Radix DropdownMenu در SSR و client ID های متفاوتی تولید می‌کنه
 *  - برای جلوگیری از hydration mismatch، تا قبل از mount
 *    یک placeholder با ابعاد یکسان رندر می‌شه
 *  - بعد از mount (useEffect) نسخه واقعی جایگزین می‌شه
 *
 * 2026-06-17: اضافه شدن مگامنوی «بازار» (BazarMegaPanel) — لیست‌های فعال
 *  RateList به‌صورت زنده از سرور به این نوار پاس داده می‌شه.
 */

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { RateListData } from '@/types/types';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import BazarMegaPanel from './BazarMegaPanel';

type NavItem = Readonly<{
  id: string;
  href: string;
  name: string;
  subItems?: NavItem[];
  isNew?: boolean;
  /** نوع آیتم: 'mega' یعنی پنل سفارشی به‌جای dropdown */
  kind?: 'mega';
}>;

type NavigationProps = Readonly<{
  className?: string;
  /** لیست‌های فعال RateList — برای مگامنوی «بازار» */
  rateLists?: RateListData[];
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
  { id: 'urgent', name: 'اخبار فوری', href: '/archive/category/news-urgent', isNew: true },
  { id: 'terms', name: 'قوانین', href: '/terms' },
] as const;

const UNDERLINE_BASE = 'absolute inset-x-2 bottom-0.5 h-px bg-neutral-900 dark:bg-neutral-50';
const HOVER_BG_BASE = 'absolute inset-0 rounded-full bg-neutral-100/60 dark:bg-neutral-800/40';

const Navigation = ({ className = '', rateLists = [] }: NavigationProps): React.ReactElement => {
  const pathname = usePathname();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLUListElement>(null);

  /* بستن پنل وقتی pathname عوض می‌شه (navigation رخ داده) */
  const closePanel = useCallback(() => {
    setActiveId(null);
    setHoveredId(null);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setHoveredId(null);
    setActiveId(null);
  }, [pathname]);

  const isActive = (item: NavItem) => {
    if (pathname === item.href) return true;
    if (item.subItems) {
      return item.subItems.some(
        (subItem) => pathname === subItem.href || pathname.startsWith(`${subItem.href}/`),
      );
    }
    return false;
  };

  useEffect(() => {
    const check = () => {
      const el = scrollRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      setShowLeftFade(el.scrollLeft > 4);
      setShowRightFade(el.scrollLeft < maxScroll - 4);
    };
    check();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      el.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item);
    const hovered = hoveredId === item.id;

    if (item.kind === 'mega') {
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
                className={cn(
                  'group/btn relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold',
                  'rounded-full outline-none whitespace-nowrap',
                  'transition-colors duration-200',
                  active
                    ? 'text-neutral-900 dark:text-neutral-50'
                    : 'text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50',
                )}
              >
                {/* Live dot */}
                <span className="relative inline-flex h-1.5 w-1.5 shrink-0" aria-hidden>
                  <span className="absolute inset-0 inline-flex h-full w-full rounded-full bg-emerald-500/50 opacity-70 anim-ping-soft" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <span className="relative z-10 tracking-[-0.005em]">{item.name}</span>

                {active && (
                  <span
                    aria-hidden
                    className={`${UNDERLINE_BASE} transition-opacity duration-200`}
                  />
                )}
                {hovered && !active && (
                  <span
                    aria-hidden
                    className={`${HOVER_BG_BASE} transition-opacity duration-150`}
                  />
                )}

                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    'relative z-10 opacity-60 transition-transform duration-200',
                    activeId === item.id ? 'rotate-180' : '',
                  )}
                  aria-hidden
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </DropdownMenuTrigger>

            {activeId === item.id && (
              <DropdownMenuContent
                forceMount
                align="start"
                sideOffset={10}
                asChild
                className={cn(
                  'min-w-[min(90vw,720px)] max-w-[min(90vw,820px)] p-0',
                  'bg-white/95 dark:bg-neutral-900/95',
                  'backdrop-blur-2xl',
                  'border border-neutral-200/80 dark:border-neutral-800/80',
                  'rounded-2xl',
                  'shadow-[0_8px_30px_-8px_rgba(20,23,32,0.12),0_0_0_1px_rgba(0,0,0,0.02)]',
                  'dark:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)]',
                  'overflow-hidden',
                  'anim-fade-in-down',
                )}
              >
                <BazarMegaPanel rateLists={rateLists} onNavigate={closePanel} />
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        </li>
      );
    }

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
                className={cn(
                  'group/btn relative z-10 inline-flex items-center gap-1 px-3 py-1.5 text-[13px] font-medium',
                  'rounded-full outline-none whitespace-nowrap',
                  'transition-colors duration-200',
                  active
                    ? 'text-neutral-900 dark:text-neutral-50'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50',
                )}
              >
                <span className="relative z-10 tracking-[-0.005em]">{item.name}</span>

                {active && (
                  <span
                    aria-hidden
                    className={`${UNDERLINE_BASE} transition-opacity duration-200`}
                  />
                )}
                {hovered && !active && (
                  <span
                    aria-hidden
                    className={`${HOVER_BG_BASE} transition-opacity duration-150`}
                  />
                )}

                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    'relative z-10 opacity-60 transition-transform duration-200',
                    activeId === item.id ? 'rotate-180' : '',
                  )}
                  aria-hidden
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </DropdownMenuTrigger>

            {activeId === item.id && (
              <DropdownMenuContent
                forceMount
                align="start"
                sideOffset={10}
                asChild
                className={cn(
                  'min-w-[14rem] max-w-[min(90vw,18rem)] p-1.5',
                  'bg-white/95 dark:bg-neutral-900/95',
                  'backdrop-blur-2xl',
                  'border border-neutral-200/80 dark:border-neutral-800/80',
                  'rounded-xl',
                  'shadow-[0_8px_30px_-8px_rgba(20,23,32,0.12),0_0_0_1px_rgba(0,0,0,0.02)]',
                  'dark:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)]',
                  'anim-fade-in-down',
                )}
              >
                <ul className="flex flex-col gap-0.5 stagger-children" key={activeId}>
                  {item.subItems.map((subItem) => {
                    const isSubActive = pathname === subItem.href;
                    return (
                      <li key={subItem.id}>
                        <DropdownMenuItem asChild>
                          <Link
                            href={subItem.href}
                            className={cn(
                              'group/sub relative flex items-center gap-3',
                              'py-2 px-3 text-[13px] rounded-lg',
                              'transition-colors duration-150 cursor-pointer',
                              isSubActive
                                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50'
                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
                            )}
                          >
                            {isSubActive && (
                              <span
                                aria-hidden
                                className="absolute inset-y-2 start-2 w-0.5 rounded-full bg-neutral-900 dark:bg-neutral-50"
                              />
                            )}
                            <span className="relative z-10 font-medium tracking-[-0.005em]">
                              {subItem.name}
                            </span>
                            <svg
                              aria-hidden
                              className={cn(
                                'ms-auto h-3 w-3 opacity-0 -translate-x-1',
                                'group-hover/sub:opacity-100 group-hover/sub:translate-x-0',
                                'transition-all duration-200 rtl:rotate-180',
                              )}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M9 18l6-6-6-6" />
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

    return (
      <li
        key={item.id}
        className="relative flex-shrink-0"
        onMouseEnter={() => setHoveredId(item.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        <Link
          href={item.href}
          className={cn(
            'group/btn relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium',
            'rounded-full outline-none whitespace-nowrap',
            'transition-colors duration-200',
            active
              ? 'text-neutral-900 dark:text-neutral-50'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50',
          )}
        >
          <span className="relative z-10 tracking-[-0.005em]">{item.name}</span>

          {active && (
            <span aria-hidden className={`${UNDERLINE_BASE} transition-opacity duration-200`} />
          )}
          {hovered && !active && (
            <span aria-hidden className={`${HOVER_BG_BASE} transition-opacity duration-150`} />
          )}

          {item.isNew && (
            <span
              aria-label="جدید"
              className="inline-flex h-1.5 w-1.5 rounded-full bg-rose-500/80"
            />
          )}
        </Link>
      </li>
    );
  };

  return (
    <nav
      className={cn('relative flex items-center', className)}
      aria-label="ناوبری اصلی"
      suppressHydrationWarning
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 start-0 w-6 z-20 transition-opacity duration-200',
          'bg-gradient-to-r from-white dark:from-neutral-950 to-transparent',
          showLeftFade ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 end-0 w-6 z-20 transition-opacity duration-200',
          'bg-gradient-to-l from-white dark:from-neutral-950 to-transparent',
          showRightFade ? 'opacity-100' : 'opacity-0',
        )}
      />

      <ul
        ref={scrollRef}
        className="
          items-center gap-0.5
          flex max-w-full overflow-x-auto
          scrollbar-none
        "
        style={{ scrollbarWidth: 'none' }}
        suppressHydrationWarning
      >
        {mounted
          ? NAVBAR_LINKS.map(renderNavItem)
          : NAVBAR_LINKS.map((item) => (
              <li key={item.id} className="relative flex-shrink-0" suppressHydrationWarning>
                <span
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] font-medium rounded-full whitespace-nowrap text-neutral-500 dark:text-neutral-400"
                  suppressHydrationWarning
                >
                  {item.name}
                </span>
              </li>
            ))}
      </ul>
    </nav>
  );
};

export default memo(Navigation);
