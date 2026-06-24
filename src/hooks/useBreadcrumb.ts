'use client';

import { createContext, useContext } from 'react';

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

export interface BreadcrumbContextValue {
  items: BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
}

export const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function useBreadcrumb(): BreadcrumbContextValue {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error('useBreadcrumb must be used within <BreadcrumbProvider>');
  }
  return ctx;
}
