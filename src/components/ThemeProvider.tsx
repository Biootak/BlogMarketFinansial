'use client';

/**
 * ThemeProvider — lightweight replacement for next-themes.
 *
 * Next.js 16 blocks <script> tags in the React tree, which breaks
 * next-themes' built-in flash-prevention script. This provider uses
 * useEffect + document.documentElement.classList instead, avoiding
 * any script injection entirely.
 *
 * Features:
 *   - Reads theme from localStorage on mount (no flash)
 *   - Applies "dark" class to <html> via classList
 *   - Exposes theme via context (useTheme hook)
 *   - Supports document.startViewTransition for smooth transitions
 */

import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'bmf-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  // Read theme from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey) as Theme | null;
      if (stored === 'light' || stored === 'dark') {
        setThemeState(stored);
        applyTheme(stored);
      }
    } catch {
      // localStorage unavailable
    }
  }, [storageKey]);

  const applyTheme = useCallback((t: Theme) => {
    const root = document.documentElement;
    if (t === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Use View Transitions API if available
    if (typeof document.startViewTransition === 'function') {
      const transition = document.startViewTransition(() => {
        // class already applied above
      });
      // تغییر تم سریع → transition قبلی skip می‌شود و promise های
      // finished/ready با AbortError reject می‌شوند. این طبیعی است و نباید
      // به overlay خطای dev تبدیل شود.
      transition.finished.catch(() => {
        // AbortError مورد انتظار — نادیده بگیر
      });
      transition.ready.catch(() => {
        // AbortError مورد انتظار — نادیده بگیر
      });
    }
  }, []);

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      try {
        localStorage.setItem(storageKey, t);
      } catch {
        // localStorage unavailable
      }
      applyTheme(t);
    },
    [storageKey, applyTheme],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeProvider;
