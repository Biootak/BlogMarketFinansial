'use client';

/**
 * Performance Provider Component
 * Initializes performance monitoring on the client side
 */

import { initPerformance } from '@/lib/performance';
import { useEffect } from 'react';

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize performance monitoring
    initPerformance();
  }, []);

  return <>{children}</>;
}
