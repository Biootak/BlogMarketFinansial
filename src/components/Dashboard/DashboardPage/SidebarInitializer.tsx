'use client';

import { useSidebarStore } from '@/hooks/sidebarStore';
import { useEffect } from 'react';

const SidebarInitializer: React.FC = () => {
  const { setIsMobile, setIsOpen } = useSidebarStore();

  useEffect(() => {
    // Animated width transition is owned by Sidebar.tsx; do not call
    // setIsOpen here on resize — only on mount. Resizing between
    // mobile/desktop triggers the Sidebar's own overlay-vs-width logic
    // via the `isMobile` flag alone.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (timer !== null) clearTimeout(timer);
      // debounce 150ms — جلوگیری از setIsMobile در هر pixel resize
      timer = setTimeout(() => {
        setIsMobile(window.innerWidth < 768);
      }, 150);
    };

    // Initial mount: derive both flags once so the Sidebar knows its
    // initial state without flicker.
    setIsMobile(window.innerWidth < 768);
    setIsOpen(window.innerWidth >= 768);

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timer !== null) clearTimeout(timer);
    };
  }, [setIsMobile, setIsOpen]);

  return null;
};

export default SidebarInitializer;
