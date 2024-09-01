'use client';

import { useSession } from 'next-auth/react';
import {
  RiMenu4Line,
  RiNotification3Line,
  RiSearch2Line,
} from 'react-icons/ri';
import SwitchDarkMode from '@/components/SwitchDarkMode/SwitchDarkMode';
import Avatar from '@/components/Avatar/Avatar';
import { useSidebarStore } from '@/hooks/sidebarStore';

const Header: React.FC = () => {
  const { data: session } = useSession();
  const { isOpen, setIsOpen, isMobile } = useSidebarStore();

  const iconClass =
    'h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-200 ease-in-out transform hover:scale-110';
  const buttonClass =
    'p-2 rounded-full text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 transition-colors duration-200';

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-full mx-auto py-2 px-4 sm:px-6 lg:px-8 flex flex-row-reverse justify-between items-center">
        {/* Left side (User menu and actions) */}
        <div className="flex items-center space-x-1 ">
          {/* Search button - hidden on mobile */}
          <button type="button" className={`hidden sm:block ${buttonClass}`} aria-label="جستجو">
            <RiSearch2Line className={iconClass} aria-hidden="true" />
          </button>

          {/* Notification button */}
          <button type="button" className={`${buttonClass} relative`} aria-label="اعلان‌ها">
            <RiNotification3Line className={iconClass} aria-hidden="true" />
            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-1 ring-white dark:ring-gray-800" />
          </button>

          {/* Dark mode switch */}
          <SwitchDarkMode />

          {/* User menu */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center focus:outline-none"
              aria-label="منوی کاربر"
            >
              <Avatar
                imgUrl={session?.user?.image}
                userName={session?.user?.name}
                sizeClass="h-9 w-9 sm:h-10 sm:w-10"
                containerClassName="border-2 border-indigo-500 hover:border-indigo-600 transition-colors duration-200 justify-center"
              />
            </button>
            {/* You can add a dropdown menu here if needed */}
          </div>
        </div>

        {/* Right side (Logo and mobile menu button) */}
        <div className="flex items-center">
          {isMobile && (
            <button
              type="button"
              className={`${buttonClass} ml-2`}
              onClick={() => setIsOpen(!isOpen)}
            >
              <RiMenu4Line className={iconClass} />
            </button>
          )}
          {/* You can add your logo here */}
        </div>
      </div>
    </header>
  );
};

export default Header;
