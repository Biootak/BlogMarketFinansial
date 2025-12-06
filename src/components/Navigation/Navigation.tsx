'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AnimatePresence, motion } from 'framer-motion';
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

const NAVBAR_LINKS: NavItem[] = [
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
];

const Navigation = ({ className = 'flex' }: NavigationProps): React.ReactElement => {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const isActive = (item: NavItem) => {
    if (pathname === item.href) return true;
    if (item.subItems) {
      return item.subItems.some((subItem) => pathname.startsWith(subItem.href));
    }
    return false;
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item);

    if (item.subItems) {
      return (
        <DropdownMenu
          dir="rtl"
          key={item.id}
          onOpenChange={(open) => setOpenDropdown(open ? item.id : null)}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={`
                group relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl
                transition-all duration-200 hover:bg-transparent
                ${
                  active
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }
              `}
            >
              <span className="relative z-10">{item.name}</span>
              <ChevronDown
                className={`
                  relative z-10 size-3.5 transition-transform duration-200 ease-out
                  ${openDropdown === item.id ? 'rotate-180' : ''}
                `}
              />
              {/* Hover background */}
              <span
                className="
                  absolute inset-0 rounded-xl
                  bg-gradient-to-br from-slate-100/90 to-slate-50/80
                  dark:from-slate-800/90 dark:to-slate-700/60
                  opacity-0 group-hover:opacity-100
                  transition-all duration-200
                "
              />
              {/* Active indicator */}
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 shadow-sm shadow-primary-500/50"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </Button>
          </DropdownMenuTrigger>
          <AnimatePresence>
            {openDropdown === item.id && (
              <DropdownMenuContent
                forceMount
                align="start"
                sideOffset={12}
                className="
                  min-w-[200px] p-2
                  bg-white/98 dark:bg-neutral-900/98
                  backdrop-blur-2xl backdrop-saturate-150
                  border border-white/50 dark:border-neutral-700/50
                  rounded-2xl
                  shadow-[0_10px_40px_-10px_rgba(0,0,0,0.12),0_4px_16px_-4px_rgba(0,0,0,0.08)]
                  dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5),0_4px_16px_-4px_rgba(0,0,0,0.3)]
                "
                asChild
              >
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  {item.subItems.map((subItem, index) => (
                    <DropdownMenuItem key={subItem.id} asChild>
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.2 }}
                      >
                        <Link
                          href={subItem.href}
                          className={`
                            group/item relative w-full flex items-center gap-3 py-3 px-3 text-sm rounded-xl cursor-pointer
                            transition-all duration-200
                            ${
                              pathname === subItem.href
                                ? 'bg-gradient-to-l from-primary-50/90 to-primary-100/60 text-primary-700 dark:from-primary-900/40 dark:to-primary-800/20 dark:text-primary-300'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }
                          `}
                        >
                          {/* Hover background */}
                          <span
                            className={`
                              absolute inset-0 rounded-xl
                              bg-gradient-to-l from-slate-100/80 to-slate-50/60
                              dark:from-slate-800/60 dark:to-slate-700/40
                              opacity-0 group-hover/item:opacity-100
                              transition-all duration-200
                              ${pathname === subItem.href ? 'hidden' : ''}
                            `}
                          />
                          {/* Active indicator dot */}
                          {pathname === subItem.href && (
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-gradient-to-b from-primary-500 to-primary-600" />
                          )}
                          <span className="relative z-10 font-medium">{subItem.name}</span>
                        </Link>
                      </motion.div>
                    </DropdownMenuItem>
                  ))}
                </motion.div>
              </DropdownMenuContent>
            )}
          </AnimatePresence>
        </DropdownMenu>
      );
    }

    return (
      <motion.li key={item.id} className="relative" whileTap={{ scale: 0.98 }}>
        <Link
          href={item.href}
          className={`
            group relative flex items-center px-4 py-2.5 text-sm font-medium rounded-xl
            transition-all duration-200
            ${
              active
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }
          `}
        >
          <span className="relative z-10">{item.name}</span>
          {/* Hover background */}
          <span
            className="
              absolute inset-0 rounded-xl
              bg-gradient-to-br from-slate-100/90 to-slate-50/80
              dark:from-slate-800/90 dark:to-slate-700/60
              opacity-0 group-hover:opacity-100
              transition-all duration-200
            "
          />
          {/* Active indicator */}
          {active && (
            <motion.span
              layoutId="nav-active-link"
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 shadow-sm shadow-primary-500/50"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </Link>
      </motion.li>
    );
  };

  return (
    <nav className="flex items-center justify-center">
      <ul className={`items-center ${className} gap-1`}>{NAVBAR_LINKS.map(renderNavItem)}</ul>
    </nav>
  );
};

export default memo(Navigation);
