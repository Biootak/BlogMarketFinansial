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
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    // Initial mount: derive both flags once so the Sidebar knows its
    // initial state without flicker.
    setIsMobile(window.innerWidth < 768);
    setIsOpen(window.innerWidth >= 768);

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile, setIsOpen]);

  return null;
};

export default SidebarInitializer;
