'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { HiOutlineBars3, HiOutlineBell, HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import SwitchDarkMode from '@/components/SwitchDarkMode/SwitchDarkMode';
import Avatar from '@/components/Avatar/Avatar';

interface NotificationBadgeProps {
  count: number;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ count }) => {
  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
      {count}
    </span>
  );
};

const Header: React.FC = () => {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationCount] = useState(3); // مثال برای تعداد اعلان‌ها

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto py-2 px-2 sm:px-4 lg:px-6 flex justify-between items-center">
        <div className="flex items-center">
          <button
            type="button"
            className="md:hidden ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={toggleMobileMenu}
            aria-label="باز کردن منو"
          >
            <HiOutlineBars3 className="w-6 h-6" />
          </button>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">
            داشبورد
          </h1>
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1 rtl">
          <SwitchDarkMode />
          <button
            type="button"
            className="p-1 rounded-full text-gray-400 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
            aria-label="جستجو"
          >
            <HiOutlineMagnifyingGlass className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="p-1 rounded-full text-gray-400 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 relative"
            aria-label="اعلان‌ها"
          >
            <HiOutlineBell className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            <NotificationBadge count={notificationCount} />
          </button>
          <button
            type="button"
            className="flex items-center focus:outline-none"
            aria-label="منوی کاربر"
          >
            <Avatar
              imgUrl={session?.user?.image}
              userName={session?.user?.name}
              sizeClass="h-7 w-7 sm:h-8 sm:w-8"
              containerClassName="border-2 border-indigo-500"
            />
            <span className="mr-2 text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline-block">
              {session?.user?.name}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
