'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from '@/lib/motion-shim';
import { useSidebarStore } from '@/hooks/sidebarStore';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import SwitchDarkMode from '@/components/SwitchDarkMode/SwitchDarkMode';
import Avatar from '@/components/Avatar/Avatar';
import { Icon } from '@/components/ui/icon';
import { HiOutlineBars3, HiOutlineSparkles, HiOutlineShieldCheck } from 'react-icons/hi2';

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
        className="absolute inset-0 bg-white/70 dark:bg-[oklch(14%_0.018_255_/_0.7)] backdrop-blur-xl border-b border-slate-200/50 dark:border-[oklch(40%_0.02_255_/_0.4)]"
        style={{
          boxShadow: '0 4px 30px rgba(0,0,0,0.06)',
        }}
      />

      {/* Gradient accent line — cyan→emerald aurora */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent dark:via-emerald-400/30" />

      <div className="relative max-w-full mx-auto py-3 px-4 sm:px-6 lg:px-8 flex flex-row-reverse justify-between items-center">
        {/* Left side - User section */}
        <div className="flex items-center gap-2">
          {/* Search button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            className="hidden sm:flex items-center justify-center w-11 h-11 rounded-xl text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all duration-200"
            aria-label="جستجو"
          >
            <Icon name="Search" className="w-5 h-5" aria-hidden="true" />
          </motion.button>

          {/* Notification button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            className="relative flex items-center justify-center w-11 h-11 rounded-xl text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all duration-200"
            aria-label="اعلان‌ها"
          >
            <Icon name="Bell" className="w-5 h-5" aria-hidden="true" />
            {/* Notification badge */}
            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gradient-to-r from-rose-500 to-pink-500 ring-2 ring-white dark:ring-slate-900" />
            </span>
          </motion.button>

          {/* Dark mode switch */}
          <div className="mx-1">
            <SwitchDarkMode />
          </div>

          {/* User menu */}
          <div className="relative" ref={popupRef}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              type="button"
              className="group flex items-center gap-3 p-1.5 pr-4 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/80 hover:from-violet-50 hover:to-purple-50 dark:hover:from-violet-900/30 dark:hover:to-purple-900/30 border border-slate-200/80 dark:border-slate-700/80 transition-all duration-300"
              style={{
                boxShadow: '0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
              onClick={() => setShowRolePopup(!showRolePopup)}
              aria-label="منوی کاربر"
            >
              <div className="hidden sm:block text-right">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
                  {user?.name || 'کاربر'}
                </p>
              </div>
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl opacity-0 group-hover:opacity-30 blur transition-opacity duration-300" />
                <Avatar
                  imgUrl={user?.profile?.avatar}
                  userName={user?.name}
                  sizeClass="h-10 w-10"
                  containerClassName="relative ring-2 ring-violet-500/20 group-hover:ring-violet-500/50 transition-all duration-300"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
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
                  className="absolute top-full mt-2 left-0 z-50 min-w-[200px] p-4 rounded-2xl bg-white dark:bg-slate-800 backdrop-blur-xl shadow-2xl border border-slate-200/80 dark:border-slate-700/80"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-r ${roleBadge.color}`}>
                      <HiOutlineShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400">سطح دسترسی</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <HiOutlineSparkles className="w-3.5 h-3.5 text-amber-500" />
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {roleBadge.label}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="absolute -top-2 left-6 w-4 h-4 bg-white dark:bg-slate-800 rotate-45 border-t border-l border-slate-200/80 dark:border-slate-700/80" />
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
              className="flex items-center justify-center w-11 h-11 rounded-xl text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all duration-200"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'بستن منو' : 'باز کردن منو'}
            >
              <HiOutlineBars3 className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
