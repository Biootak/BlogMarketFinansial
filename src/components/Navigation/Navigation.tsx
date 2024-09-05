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

const NAVBAR_LINKS: readonly NavItem[] = [
  {
    id: '0',
    href: '/',
    name: 'صفحه اصلی',
  },
  {
    id: '1',
    href: '/archive',
    name: 'وبلاگ',
  },
  {
    id: '2',
    href: '/market',
    name: 'اخبار',
    subItems: [
      { id: '2-1', href: '/archive?category=technology', name: 'فناوری' },
      { id: '2-2', href: '/archive?category=business', name: 'کسب و کار' },
      { id: '2-3', href: '/archive?category=science', name: 'علم' },
      { id: '2-4', href: '/archive?category=health', name: 'سلامت' },
      { id: '2-5', href: '/archive?category=entertainment', name: 'سرگرمی' },
    ],
  },
  {
    id: '3',
    href: '/about',
    name: 'درباره ما',
  },
  {
    id: '4',
    href: '/contact',
    name: 'تماس با ما',
  },
] as const;

const Navigation = ({ className = 'flex' }: NavigationProps): JSX.Element => {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const renderNavItem = (item: NavItem) => {
    const isActive =
      pathname === item.href ||
      // biome-ignore lint/complexity/useOptionalChain: <explanation>
      (item.subItems && item.subItems.some((subItem) => pathname === subItem.href));

    if (item.subItems) {
      return (
        <DropdownMenu key={item.id} onOpenChange={(open) => setOpenDropdown(open ? item.id : null)}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={`flex items-center space-x-1 rtl:space-x-reverse ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`}
            >
              {item.name}
              <IoChevronDownOutline
                className={`h-4 w-4 transition-transform duration-200 ${openDropdown === item.id ? 'rotate-180' : ''}`}
              />
            </Button>
          </DropdownMenuTrigger>
          <AnimatePresence>
            {openDropdown === item.id && (
              <DropdownMenuContent forceMount>
                {item.subItems.map((subItem) => (
                  <DropdownMenuItem key={subItem.id} asChild>
                    <Link href={subItem.href} className="w-full">
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
        <Link
          href={item.href}
          className={`block py-2 px-4 transition-colors duration-200 font-medium rounded-md
            ${
              isActive
                ? 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20'
                : 'text-gray-700 hover:text-primary-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-primary-400 dark:hover:bg-gray-800'
            }`}
        >
          {item.name}
        </Link>
      </motion.li>
    );
  };

  return (
    <nav className="flex items-center justify-center">
      <ul className={`nc-Navigation items-center ${className}`}>
        {NAVBAR_LINKS.map(renderNavItem)}
      </ul>
    </nav>
  );
};

export default memo(Navigation);
