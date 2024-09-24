'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import { logout } from '@/actions/auth-actions';
import { useToast } from '@/components/ui/use-toast';
import Logo from '@/components/Logo/Logo';
import { MdMenuOpen, MdOutlineDashboard } from 'react-icons/md';
import { IoHomeOutline, IoExitOutline } from 'react-icons/io5';
import { FaProductHunt, FaUsers, FaUserCircle } from 'react-icons/fa';
import { CiSettings } from 'react-icons/ci';
import { SiGoogleads } from 'react-icons/si';
import { MdCurrencyExchange } from 'react-icons/md';
import { useSidebarStore } from '@/hooks/sidebarStore';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMemo } from 'react';

const menuItems = [
  { href: '/dashboard', icon: <IoHomeOutline size={24} />, label: 'داشبورد' },
  { href: '/dashboard/posts', icon: <FaProductHunt size={24} />, label: 'پست ها' },
  {
    href: '/dashboard/categories',
    icon: <MdOutlineDashboard size={24} />,
    label: 'دسته بندی',
  },
  { href: '/dashboard/advertisements', icon: <SiGoogleads size={24} />, label: 'تبلیغات' },
  {
    href: '/dashboard/exchange-rates',
    icon: <MdCurrencyExchange size={24} />,
    label: 'نرخ ارز ها ',
  },
  { href: '/dashboard/users', icon: <FaUsers size={24} />, label: 'کاربران' },
  { href: '/dashboard/edit-profile', icon: <CiSettings size={24} />, label: 'تنظیمات' },
];

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { isOpen, setIsOpen, isMobile } = useSidebarStore();

  const user = useCurrentUser();

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

  const sidebarVariants = useMemo(
    () => ({
      open: { width: isMobile ? '100%' : '240px', transition: { duration: 0.3 } },
      closed: { width: isMobile ? '0' : '60px', transition: { duration: 0.3 } },
    }),
    [isMobile],
  );

  return (
    <>
      <motion.nav
        dir="rtl"
        initial="closed"
        animate={isOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
        className={`fixed top-0 right-0 h-full bg-blue-600 dark:bg-gray-800 text-white shadow-lg z-40 
                    overflow-hidden transition-all duration-300`}
      >
        <div className="h-full flex flex-col p-2">
          <div className="flex justify-between items-center mb-10">
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <Logo className="w-10 rounded-md" />
                </motion.div>
              )}
            </AnimatePresence>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="p-2">
              <MdMenuOpen
                size={24}
                className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          <ul className="space-y-4 flex-grow">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>
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
                          transition={{ duration: 0.2, delay: 0.1 }}
                          className="mr-4"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center w-full p-2 rounded-md text-blue-100 dark:text-gray-300 hover:bg-blue-700 dark:hover:bg-gray-700 transition-colors duration-200"
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
                  transition={{ duration: 0.2, delay: 0.1 }}
                  className="mr-4"
                >
                  خروج
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <div className="mt-4 flex items-center p-2 bg-blue-700 dark:bg-gray-700 rounded-md">
            <div className="w-6 h-6 flex items-center justify-center">
              <FaUserCircle size={24} />
            </div>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  className="mr-4"
                >
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm text-blue-200 dark:text-gray-400">{user?.email}</p>
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
        />
      )}
    </>
  );
};

export default Sidebar;
