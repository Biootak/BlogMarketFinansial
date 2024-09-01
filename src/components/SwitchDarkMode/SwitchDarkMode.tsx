'use client';

import type React from 'react';

import { useThemeMode } from '@/hooks/useThemeMode';
import { motion } from 'framer-motion';
import { RiMoonLine, RiSunLine } from 'react-icons/ri';

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
      className={`p-2 rounded-full text-gray-400 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 ${className}`}
      aria-label={isDarkMode ? 'فعال کردن حالت روشن' : 'فعال کردن حالت تاریک'}
    >
      {isDarkMode ? (
        <RiSunLine className="  h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 transition-transform duration-200 ease-in-out transform hover:scale-110" />
      ) : (
        <RiMoonLine className="  h-5 w-5 sm:h-6 sm:w-6  text-gray-500  hover: hover:text-indigo-600 transition-transform duration-200 ease-in-out transform hover:scale-110" />
      )}
    </motion.button>
  );
};

export default SwitchDarkMode;
