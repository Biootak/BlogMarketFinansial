'use client';

import type React from 'react';
import { HiMoon, HiOutlineSun } from 'react-icons/hi2';
import { useThemeMode } from '@/hooks/useThemeMode';
import { motion } from 'framer-motion';

export interface SwitchDarkModeProps {
  className?: string;
}

const SwitchDarkMode: React.FC<SwitchDarkModeProps> = ({ className = '' }) => {
  const { _toogleDarkMode, isDarkMode } = useThemeMode();

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={_toogleDarkMode}
      className={`p-1 rounded-full text-gray-400 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 ${className}`}
      aria-label={isDarkMode ? 'فعال کردن حالت روشن' : 'فعال کردن حالت تاریک'}
    >
      {isDarkMode ? (
        <HiMoon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
      ) : (
        <HiOutlineSun className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
      )}
    </motion.button>
  );
};

export default SwitchDarkMode;
