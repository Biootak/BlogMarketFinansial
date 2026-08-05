'use client';

import { BreadcrumbContext, type BreadcrumbItem } from '@/hooks/useBreadcrumb';
import { type ReactNode, useMemo, useState } from 'react';

interface BreadcrumbProviderProps {
  children: ReactNode;
  initialItems?: BreadcrumbItem[];
}

export function BreadcrumbProvider({ children, initialItems = [] }: BreadcrumbProviderProps) {
  const [items, setItems] = useState<BreadcrumbItem[]>(initialItems);
  // setItems از useState پایدار است؛ memo کردن مقدار provider مانع
  // re-render همه مصرف‌کننده‌ها روی هر رندر خود provider می‌شود.
  const value = useMemo(() => ({ items, setItems }), [items]);
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}
