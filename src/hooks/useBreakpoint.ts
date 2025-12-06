'use client';

import { type Breakpoint, getCurrentBreakpoint } from '@/lib/responsive/breakpoints';
import { useEffect, useState } from 'react';

/**
 * Hook to get current breakpoint
 * Updates on window resize
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    // Set initial breakpoint
    setBreakpoint(getCurrentBreakpoint());

    // Update on resize
    const handleResize = () => {
      setBreakpoint(getCurrentBreakpoint());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}
