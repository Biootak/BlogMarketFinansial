'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IoChevronDownOutline } from 'react-icons/io5';

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
    name: 'ارز دیجیتال',
    href: '/archive/category/crypto',
    subItems: [
      { id: 'crypto-urgent', name: 'اخبار فوری', href: '/archive/category/crypto/urgent' },
      { id: 'crypto-important', name: 'اخبار مهم', href: '/archive/category/crypto/important' },
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
      { id: 'gold-local', name: 'بازار داخلی', href: '/archive/category/gold/local' },
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
  { id: 'analysis', name: 'تحلیل', href: '/archive/category/analysis' },
  { id: 'education', name: 'آموزش', href: '/archive/category/education' },
  { id: 'money-transfer', name: 'حواله', href: '/services/money-transfer' },
  { id: 'online-payment', name: 'پرداخت آنلاین', href: '/services/online-payment' },
];

const Navigation = ({ className = 'flex' }: NavigationProps): JSX.Element => {
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

    const commonClasses = `
      py-2 px-3 transition-colors duration-200 font-medium rounded-md text-sm
      ${
        active
          ? 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20'
          : 'text-gray-700 hover:text-primary-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-primary-400 dark:hover:bg-gray-800'
      }
    `;

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
              className={`flex items-center justify-between ${commonClasses}`}
            >
              {item.name}
              <IoChevronDownOutline
                className={`h-3 w-3 transition-transform duration-200 mr-1 ${openDropdown === item.id ? 'rotate-180' : ''}`}
              />
            </Button>
          </DropdownMenuTrigger>
          <AnimatePresence>
            {openDropdown === item.id && (
              <DropdownMenuContent forceMount className="w-48">
                {item.subItems.map((subItem) => (
                  <DropdownMenuItem key={subItem.id} asChild>
                    <Link
                      href={subItem.href}
                      className="w-full py-2 px-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {subItem.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            )}
          </AnimatePresence>
        </DropdownMenu>
      );
    }

    return (
      <motion.li key={item.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Link href={item.href} className={commonClasses}>
          {item.name}
        </Link>
      </motion.li>
    );
  };

  return (
    <nav className="flex items-center justify-center">
      <ul className={`nc-Navigation items-center ${className} space-x-1 rtl:space-x-reverse`}>
        {NAVBAR_LINKS.map(renderNavItem)}
      </ul>
    </nav>
  );
};

export default memo(Navigation);
