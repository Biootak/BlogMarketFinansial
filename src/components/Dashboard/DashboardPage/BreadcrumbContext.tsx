'use client';

import { useState, type ReactNode } from 'react';
import { BreadcrumbContext, type BreadcrumbItem } from '@/hooks/useBreadcrumb';

interface BreadcrumbProviderProps {
  children: ReactNode;
  initialItems?: BreadcrumbItem[];
}

export function BreadcrumbProvider({ children, initialItems = [] }: BreadcrumbProviderProps) {
  const [items, setItems] = useState<BreadcrumbItem[]>(initialItems);
  return <BreadcrumbContext.Provider value={{ items, setItems }}>{children}</BreadcrumbContext.Provider>;
}
