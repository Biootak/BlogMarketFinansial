'use client';

import { useSidebarStore } from '@/hooks/sidebarStore';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import SwitchDarkMode from '@/components/SwitchDarkMode/SwitchDarkMode';
import Avatar from '@/components/Avatar/Avatar';
import { Icon } from '@/components/ui/icon';

const Header: React.FC = () => {
  const user = useCurrentUser();
  const { isOpen, setIsOpen, isMobile } = useSidebarStore();

  const iconClass = 'transition-transform duration-200 ease-in-out transform hover:scale-110';
  const buttonClass =
    'p-2 rounded-full text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 transition-colors duration-200';

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-full mx-auto py-2 px-4 sm:px-6 lg:px-8 flex flex-row-reverse justify-between items-center">
        {/* Left side (User menu and actions) */}
        <div className="flex items-center space-x-1 ">
          {/* Search button - hidden on mobile */}
          <button type="button" className={`hidden sm:block ${buttonClass}`} aria-label="جستجو">
            <Icon name="Search" className={iconClass} aria-hidden="true" />
          </button>

          {/* Notification button */}
          <button type="button" className={`${buttonClass} relative`} aria-label="اعلان‌ها">
            <Icon name="Bell" className={iconClass} aria-hidden="true" />
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
                imgUrl={user?.profile?.avatar || user?.image}
                userName={user?.name}
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
              <Icon name="Menu" className={iconClass} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
