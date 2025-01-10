'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import { logout } from '@/actions/auth-actions';
import { useToast } from '@/components/ui/use-toast';
import Logo from '@/components/Logo/Logo';
import { MdMenuOpen, MdOutlineDashboard } from 'react-icons/md';
import { IoHomeOutline, IoExitOutline, IoChevronDownOutline } from 'react-icons/io5';
import { FaProductHunt, FaUsers, FaUserCircle } from 'react-icons/fa';
import { CiSettings } from 'react-icons/ci';
import { SiGoogleads } from 'react-icons/si';
import { MdCurrencyExchange } from 'react-icons/md';
import { useSidebarStore } from '@/hooks/sidebarStore';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMemo, useState } from 'react';

interface SubmenuItem {
  href: string;
  label: string;
}

interface MenuItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  submenu?: SubmenuItem[];
}

interface SidebarProps {
  userRole: 'USER' | 'AUTHOR' | 'ADMIN' | 'SUPER_ADMIN';
}

const getMenuItems = (role: string) => {
  const baseItems = [
    {
      title: 'داشبورد',
      href: '/dashboard',
      icon: <IoHomeOutline size={24} />,
      label: 'داشبورد'
    }
  ];

  const postItem = {
    title: 'پست‌ها',
    href: '/dashboard/posts',
    icon: <FaProductHunt size={24} />,
    label: 'پست ها'
  };

  const adminItems = [
    {
      title: 'کاربران',
      href: '/dashboard/users',
      icon: <FaUsers size={24} />,
      label: 'کاربران'
    },
    {
      title: 'دسته بندی',
      href: '/dashboard/categories',
      icon: <MdOutlineDashboard size={24} />,
      label: 'دسته بندی'
    },
    {
      title: 'تبلیغات',
      href: '/dashboard/advertisements',
      icon: <SiGoogleads size={24} />,
      label: 'تبلیغات'
    },
    {
      title: 'نرخ ارزها',
      href: '#',
      icon: <MdCurrencyExchange size={24} />,
      label: 'نرخ ارزها',
      submenu: [
        { href: '/dashboard/exchange-rates', label: 'نرخ تکی' },
        { href: '/dashboard/rate-lists', label: 'نرخ لیستی' }
      ]
    }
  ];

  const superAdminItems = [
    ...adminItems,
    {
      title: 'تنظیمات سیستم',
      href: '/dashboard/settings',
      icon: <CiSettings size={24} />,
      label: 'تنظیمات سیستم'
    },
    {
      title: 'گزارش‌ها',
      href: '/dashboard/reports',
      icon: <MdOutlineDashboard size={24} />,
      label: 'گزارش‌ها'
    }
  ];

  const profileItem = {
    title: 'پروفایل من',
    href: '/dashboard/edit-profile',
    icon: <CiSettings size={24} />,
    label: 'پروفایل من'
  };

  switch (role) {
    case 'SUPER_ADMIN':
      return [...baseItems, postItem, ...superAdminItems, profileItem];
    case 'ADMIN':
      return [...baseItems, postItem, ...adminItems, profileItem];
    case 'AUTHOR':
      return [
        ...baseItems,
        postItem,
        {
          title: 'دسته بندی',
          href: '/dashboard/categories',
          icon: <MdOutlineDashboard size={24} />,
          label: 'دسته بندی'
        },
        profileItem
      ];
    default:
      return [];
  }
};

const Sidebar = ({ userRole }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { isOpen, setIsOpen, isMobile } = useSidebarStore();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const menuItems: MenuItem[] = getMenuItems(userRole);

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        toast({
          title: 'خروج موفق',
          description: 'شما با موفقیت از حساب کاربری خود خارج شدید.',
          variant: 'success',
        });
        router.push('/signin');
      } else {
        toast({
          title: 'خطا در خروج',
          description:
            result.message || 'مشکلی در خروج از حساب کاربری پیش آمد. لطفا دوباره تلاش کنید.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'خطای سیستمی',
        description: 'مشکلی در سیستم رخ داده است. لطفا بعدا دوباره تلاش کنید.',
        variant: 'destructive',
      });
    }
  };

  const toggleSubmenu = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const sidebarVariants = useMemo(
    () => ({
      open: { width: isMobile ? '100%' : '240px', transition: { duration: 0.3 } },
      closed: { width: isMobile ? '0' : '60px', transition: { duration: 0.3 } },
    }),
    [isMobile]
  );

  const handleItemClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <motion.nav
        dir="rtl"
        initial="closed"
        animate={isOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
        className={`fixed top-0 right-0 h-full bg-blue-600 dark:bg-gray-800 text-white shadow-lg z-40 
                    overflow-hidden transition-all duration-300 flex flex-col`}
      >
        <div className="flex-shrink-0 p-2">
          <div className="flex justify-between items-center mb-6">
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center"
                >
                  <Logo className="w-10 h-10 rounded-md" />
                </motion.div>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 hover:bg-blue-700 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
              aria-label={isOpen ? 'بستن منو' : 'باز کردن منو'}
            >
              <MdMenuOpen
                size={24}
                className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-700 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <ul className="space-y-2 p-2">
            {menuItems.map((item) => (
              <li key={item.href}>
                {item.submenu ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleSubmenu(item.label)}
                      className={`flex items-center w-full p-2 rounded-md transition-colors duration-200
                                ${
                                  pathname.startsWith(item.href.split('#')[0])
                                    ? 'bg-blue-700 dark:bg-gray-700 text-white'
                                    : 'text-blue-100 dark:text-gray-300 hover:bg-blue-700 dark:hover:bg-gray-700'
                                }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center">{item.icon}</div>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="mr-3 font-medium flex-1 flex items-center justify-between"
                          >
                            <span>{item.label}</span>
                            <IoChevronDownOutline
                              className={`transform transition-transform duration-200 ${
                                expandedItems.includes(item.label) ? 'rotate-180' : ''
                              }`}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                    <AnimatePresence>
                      {isOpen && expandedItems.includes(item.label) && (
                        <motion.ul
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="pr-6 mt-1 space-y-1"
                        >
                          {item.submenu.map((submenuItem) => (
                            <li key={submenuItem.href}>
                              <Link href={submenuItem.href} onClick={handleItemClick}>
                                <span
                                  className={`flex items-center p-2 rounded-md transition-colors duration-200
                                    ${
                                      pathname === submenuItem.href
                                        ? 'bg-blue-700 dark:bg-gray-700 text-white'
                                        : 'text-blue-100 dark:text-gray-300 hover:bg-blue-700 dark:hover:bg-gray-700'
                                    }`}
                                >
                                  <div className="w-2 h-2 bg-blue-300 dark:bg-gray-400 rounded-full" />
                                  <span className="mr-3 font-medium">{submenuItem.label}</span>
                                </span>
                              </Link>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link href={item.href} onClick={handleItemClick}>
                    <span
                      className={`flex items-center p-2 rounded-md transition-colors duration-200
                                ${
                                  pathname === item.href
                                    ? 'bg-blue-700 dark:bg-gray-700 text-white'
                                    : 'text-blue-100 dark:text-gray-300 hover:bg-blue-700 dark:hover:bg-gray-700'
                                }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center">{item.icon}</div>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="mr-3 font-medium"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-shrink-0 p-2 border-t border-blue-500 dark:border-gray-700">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center w-full p-2 mb-4 rounded-md text-blue-100 dark:text-gray-300 hover:bg-blue-700 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <IoExitOutline size={24} />
            </div>
            <AnimatePresence>
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="mr-3 font-medium"
                >
                  خروج
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <div className="mb-4 flex items-center p-2 bg-blue-700 dark:bg-gray-700 rounded-md">
            <div className="w-8 h-8 flex items-center justify-center bg-blue-800 dark:bg-gray-600 rounded-full">
              <FaUserCircle size={24} />
            </div>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="mr-3 overflow-hidden"
                >
                  <p className="font-medium truncate">کاربر</p>
                  <p className="text-sm text-blue-200 dark:text-gray-400 truncate">کاربر@example.com</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.nav>

      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(false);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="بستن منو"
        />
      )}
    </>
  );
};

export default Sidebar;
