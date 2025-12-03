'use client';

import { motion } from 'framer-motion';
import { useSidebarStore } from '@/hooks/sidebarStore';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import SwitchDarkMode from '@/components/SwitchDarkMode/SwitchDarkMode';
import Avatar from '@/components/Avatar/Avatar';
import { Icon } from '@/components/ui/icon';

const Header: React.FC = () => {
  const user = useCurrentUser();
  const { isOpen, setIsOpen, isMobile } = useSidebarStore();

  return (
    <header className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/[0.02] via-transparent to-indigo-500/[0.02] pointer-events-none" />
      
      <div className="relative max-w-full mx-auto py-3 px-4 sm:px-6 lg:px-8 flex flex-row-reverse justify-between items-center">
        {/* Left side (User menu and actions) */}
        <div className="flex items-center gap-1">
          {/* Search button - hidden on mobile */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-all duration-200"
            aria-label="جستجو"
          >
            <Icon name="Search" className="w-5 h-5" aria-hidden="true" />
          </motion.button>

          {/* Notification button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            className="relative flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-all duration-200"
            aria-label="اعلان‌ها"
          >
            <Icon name="Bell" className="w-5 h-5" aria-hidden="true" />
            {/* Notification badge */}
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            </span>
          </motion.button>

          {/* Dark mode switch */}
          <div className="mx-1">
            <SwitchDarkMode />
          </div>

          {/* User menu */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="relative"
          >
            <button
              type="button"
              className="group flex items-center gap-3 p-1.5 pr-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-slate-200/50 dark:border-slate-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-all duration-200"
              aria-label="منوی کاربر"
            >
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
                  {user?.name || 'کاربر'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user?.role === 'SUPER_ADMIN' ? 'مدیر ارشد' : user?.role === 'ADMIN' ? 'مدیر' : 'نویسنده'}
                </p>
              </div>
              <div className="relative">
                <Avatar
                  imgUrl={user?.profile?.avatar}
                  userName={user?.name}
                  sizeClass="h-9 w-9"
                  containerClassName="ring-2 ring-violet-500/30 group-hover:ring-violet-500 transition-all duration-200"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
              </div>
            </button>
          </motion.div>
        </div>

        {/* Right side (Mobile menu button) */}
        <div className="flex items-center">
          {isMobile && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-all duration-200"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'بستن منو' : 'باز کردن منو'}
            >
              <Icon name="Menu" className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
