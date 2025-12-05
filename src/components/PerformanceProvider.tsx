'use client';

/**
 * Performance Provider Component
 * Initializes performance monitoring on the client side
 */

import { useEffect } from 'react';
import { initPerformance } from '@/lib/performance';

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize performance monitoring
    initPerformance();
  }, []);

  return <>{children}</>;
}
