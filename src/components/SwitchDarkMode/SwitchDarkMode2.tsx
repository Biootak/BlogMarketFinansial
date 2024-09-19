// components/SwitchDarkMode/SwitchDarkMode2.tsx
'use client';

import { Switch } from '@/app/headlessui';
import { useThemeMode } from '@/hooks/useThemeMode';
import { ThemeIcon } from '@/components/Icons';

export interface SwitchDarkModeProps {
  className?: string;
}

const DarkModeSwitch = ({ className }: SwitchDarkModeProps) => {
  const { _toogleDarkMode, isDarkMode } = useThemeMode();

  return (
    <div className="flex items-center justify-between p-2 transition duration-150 ease-in-out rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50">
      <div className="flex items-center">
        <ThemeIcon
          className="flex-shrink-0 w-6 h-6 text-neutral-500 dark:text-neutral-300 ml-4"
          title="تم تاریک"
        />
        <span className="text-sm font-medium">تم تاریک</span>
      </div>
      <div className={`inline-flex ${className || ''}`} dir="rtl">
        <span className="sr-only">فعال‌سازی حالت تاریک</span>
        <Switch
          checked={isDarkMode}
          onChange={_toogleDarkMode}
          className={`${isDarkMode ? 'bg-teal-600' : 'bg-gray-300'}
            relative inline-flex h-[22px] w-[42px] shrink-0 cursor-pointer rounded-full border-4 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75`}
        >
          <span className="sr-only">فعال‌سازی حالت تاریک</span>
          <span
            aria-hidden="true"
            className={`${isDarkMode ? '-translate-x-5' : 'translate-x-0'}
              pointer-events-none inline-block h-[14px] w-[14px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
          />
        </Switch>
      </div>
    </div>
  );
};

export default DarkModeSwitch;
