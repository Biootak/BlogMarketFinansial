'use client';

import { Switch } from '@/app/headlessui';
import { ThemeIcon } from '@/components/Icons';
import { useThemeMode } from '@/hooks/useThemeMode';

export interface SwitchDarkModeProps {
  className?: string;
}

const DarkModeSwitch = ({ className }: SwitchDarkModeProps) => {
  const { toggleDarkMode, isDarkMode } = useThemeMode();

  return (
    <div
      className={`
        group flex items-center justify-between p-2.5
        rounded-xl
        hover:bg-gradient-to-l hover:from-neutral-50/80 hover:to-neutral-100/50
        dark:hover:from-neutral-800/60 dark:hover:to-neutral-700/40
        transition-all duration-300 ease-out
        ${className || ''}
      `}
    >
      <div className="flex items-center gap-3">
        <span
          className="
            flex items-center justify-center w-9 h-9
            rounded-xl
            bg-neutral-100/80 dark:bg-neutral-800/80
            group-hover:bg-amber-100/80 dark:group-hover:bg-amber-900/30
            transition-all duration-300
          "
        >
          <ThemeIcon
            className="w-5 h-5 text-neutral-500 dark:text-neutral-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300"
            title="تم تاریک"
          />
        </span>
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">تم تاریک</span>
      </div>

      <div dir="rtl">
        <span className="sr-only">فعال‌سازی حالت تاریک</span>
        <Switch
          checked={isDarkMode}
          onChange={toggleDarkMode}
          className={`
            relative inline-flex h-6 w-11 shrink-0 cursor-pointer
            rounded-full border-2 border-transparent
            transition-all duration-300 ease-out
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
            ${
              isDarkMode
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 shadow-inner shadow-primary-700/20'
                : 'bg-neutral-200 dark:bg-neutral-700'
            }
          `}
        >
          <span className="sr-only">فعال‌سازی حالت تاریک</span>
          <span
            aria-hidden="true"
            className={`
              pointer-events-none inline-block h-5 w-5
              transform rounded-full bg-white
              shadow-md ring-0
              transition-all duration-300 ease-out
              ${isDarkMode ? '-translate-x-5 shadow-primary-500/20' : 'translate-x-0'}
            `}
          />
        </Switch>
      </div>
    </div>
  );
};

export default DarkModeSwitch;
