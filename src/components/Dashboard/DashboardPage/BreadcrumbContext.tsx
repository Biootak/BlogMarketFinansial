'use client';

import { BreadcrumbContext, type BreadcrumbItem } from '@/hooks/useBreadcrumb';
import { type ReactNode, useState } from 'react';

interface BreadcrumbProviderProps {
  children: ReactNode;
  initialItems?: BreadcrumbItem[];
}

export function BreadcrumbProvider({ children, initialItems = [] }: BreadcrumbProviderProps) {
  const [items, setItems] = useState<BreadcrumbItem[]>(initialItems);
  return (
    <BreadcrumbContext.Provider value={{ items, setItems }}>{children}</BreadcrumbContext.Provider>
  );
}
