'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export const useThemeMode = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted ? resolvedTheme === 'dark' : false;

  const toDark = () => {
    setTheme('dark');
  };

  const toLight = () => {
    setTheme('light');
  };

  const _toogleDarkMode = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return {
    isDarkMode,
    toDark,
    toLight,
    _toogleDarkMode,
  };
};
