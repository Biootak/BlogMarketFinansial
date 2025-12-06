'use client';

import Avatar from '@/components/Avatar/Avatar';
import SwitchDarkMode from '@/components/SwitchDarkMode/SwitchDarkMode';
import { Icon } from '@/components/ui/icon';
import { useSidebarStore } from '@/hooks/sidebarStore';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { HiOutlineBars3, HiOutlineShieldCheck, HiOutlineSparkles } from 'react-icons/hi2';

const getRoleBadge = (role?: string) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return { label: 'مدیر ارشد', color: 'from-rose-500 to-pink-600' };
    case 'ADMIN':
      return { label: 'مدیر', color: 'from-violet-500 to-purple-600' };
    case 'AUTHOR':
      return { label: 'نویسنده', color: 'from-amber-500 to-orange-500' };
    default:
      return { label: 'کاربر', color: 'from-slate-500 to-gray-600' };
  }
};

const Header: React.FC = () => {
  const user = useCurrentUser();
  const { isOpen, setIsOpen, isMobile } = useSidebarStore();
  const [showRolePopup, setShowRolePopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const roleBadge = getRoleBadge(user?.role);

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowRolePopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="relative z-30">
      {/* Glass background */}
      <div
        className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50"
        style={{
          boxShadow: '0 4px 30px rgba(0,0,0,0.03)',
        }}
      />

      {/* Gradient accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

      <div className="relative max-w-full mx-auto py-2 sm:py-2.5 lg:py-3 px-3 sm:px-4 md:px-6 lg:px-8 flex flex-row-reverse justify-between items-center">
        {/* Left side - User section */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Search button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            className="hidden md:flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-lg sm:rounded-xl text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all duration-200"
            aria-label="جستجو"
          >
            <Icon name="Search" className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </motion.button>

          {/* Notification button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-lg sm:rounded-xl text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all duration-200"
            aria-label="اعلان‌ها"
          >
            <Icon name="Bell" className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            {/* Notification badge */}
            <span className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 flex h-2 w-2 sm:h-2.5 sm:w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-gradient-to-r from-rose-500 to-pink-500 ring-1 sm:ring-2 ring-white dark:ring-slate-900" />
            </span>
          </motion.button>

          {/* Dark mode switch */}
          <div className="mx-0.5 sm:mx-1">
            <SwitchDarkMode />
          </div>

          {/* User menu */}
          <div className="relative" ref={popupRef}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              type="button"
              className="group flex items-center gap-2 sm:gap-2.5 lg:gap-3 p-1 sm:p-1.5 pr-2 sm:pr-3 lg:pr-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/80 hover:from-violet-50 hover:to-purple-50 dark:hover:from-violet-900/30 dark:hover:to-purple-900/30 border border-slate-200/80 dark:border-slate-700/80 transition-all duration-300"
              style={{
                boxShadow: '0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
              onClick={() => setShowRolePopup(!showRolePopup)}
              aria-label="منوی کاربر"
            >
              <div className="hidden md:block text-right">
                <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors truncate max-w-[100px] lg:max-w-[150px]">
                  {user?.name || 'کاربر'}
                </p>
              </div>
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl opacity-0 group-hover:opacity-30 blur transition-opacity duration-300" />
                <Avatar
                  imgUrl={user?.profile?.avatar}
                  userName={user?.name}
                  sizeClass="h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10"
                  containerClassName="relative ring-2 ring-violet-500/20 group-hover:ring-violet-500/50 transition-all duration-300"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-3.5 lg:h-3.5 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full ring-1 sm:ring-2 ring-white dark:ring-slate-900" />
              </div>
            </motion.button>

            {/* Role Popup */}
            <AnimatePresence>
              {showRolePopup && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full mt-2 left-0 z-50 min-w-[160px] sm:min-w-[200px] p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 backdrop-blur-xl shadow-2xl border border-slate-200/80 dark:border-slate-700/80"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div
                      className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-r ${roleBadge.color} flex-shrink-0`}
                    >
                      <HiOutlineShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="text-right min-w-0">
                      <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                        سطح دسترسی
                      </p>
                      <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5">
                        <HiOutlineSparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 flex-shrink-0" />
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                          {roleBadge.label}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="absolute -top-2 left-4 sm:left-6 w-4 h-4 bg-white dark:bg-slate-800 rotate-45 border-t border-l border-slate-200/80 dark:border-slate-700/80" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right side - Mobile menu button */}
        <div className="flex items-center">
          {isMobile && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all duration-200"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'بستن منو' : 'باز کردن منو'}
            >
              <HiOutlineBars3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
