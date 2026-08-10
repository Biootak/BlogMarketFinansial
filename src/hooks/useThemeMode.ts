'use client';

import { useTheme } from '@/components/ThemeProvider';
import { useEffect, useState } from 'react';

export const useThemeMode = () => {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted ? theme === 'dark' : false;

  const toDark = () => {
    setTheme('dark');
  };

  const toLight = () => {
    setTheme('light');
  };

  const toggleDarkMode = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return {
    isDarkMode,
    toDark,
    toLight,
    toggleDarkMode,
  };
};
