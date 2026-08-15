'use client';

import type React from 'react';

import { useThemeMode } from '@/hooks/useThemeMode';
import { motion } from '@/lib/motion-shim';
import { Moon, Sun } from 'lucide-react';

export interface SwitchDarkModeProps {
  className?: string;
}

const SwitchDarkMode: React.FC<SwitchDarkModeProps> = ({ className = '' }) => {
  const { toggleDarkMode, isDarkMode } = useThemeMode();

  const handleToggle = () => {
    toggleDarkMode();
    // اطمینان از اعمال کلاس
    const newTheme = isDarkMode ? 'light' : 'dark';
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleToggle}
      className={`p-2 rounded-full text-neutral-400 hover:text-neutral-500 dark:text-neutral-400 dark:hover:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-neutral-800 ${className}`}
      aria-label={isDarkMode ? 'فعال کردن حالت روشن' : 'فعال کردن حالت تاریک'}
    >
      {isDarkMode ? (
        <Sun className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 transition-transform duration-200 ease-in-out transform hover:scale-110" />
      ) : (
        <Moon className="h-5 w-5 sm:h-6 sm:w-6 text-neutral-500 hover:text-primary-600 transition-transform duration-200 ease-in-out transform hover:scale-110" />
      )}
    </motion.button>
  );
};

export default SwitchDarkMode;
