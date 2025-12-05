/**
 * Dynamic Import Utilities
 * For code splitting and lazy loading heavy components
 */

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

/**
 * Loading component for dynamic imports
 */
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
    </div>
  );
}

/**
 * Create dynamic import with loading state
 */
export function createDynamicImport<P = {}>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    ssr?: boolean;
    loading?: ComponentType;
  }
) {
  return dynamic(importFn, {
    ssr: options?.ssr ?? false,
    loading: options?.loading ?? LoadingSpinner,
  });
}

/**
 * Preload a dynamic component
 */
export async function preloadComponent<P = {}>(
  importFn: () => Promise<{ default: ComponentType<P> }>
): Promise<void> {
  try {
    await importFn();
  } catch (error) {
    console.error('Failed to preload component:', error);
  }
}
