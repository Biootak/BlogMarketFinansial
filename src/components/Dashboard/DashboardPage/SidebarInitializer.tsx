'use client';

import { useSidebarStore } from '@/hooks/sidebarStore';
import { useEffect } from 'react';

const SidebarInitializer: React.FC = () => {
  const { setIsMobile, setIsOpen } = useSidebarStore();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsOpen(!mobile);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile, setIsOpen]);

  return null;
};

export default SidebarInitializer;
