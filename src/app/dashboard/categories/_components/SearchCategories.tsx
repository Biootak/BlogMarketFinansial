'use client';

import { SearchInput } from '@/components/Dashboard/primitives';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { useDebouncedCallback } from 'use-debounce';

/**
 * SearchCategories — جستجوی دسته‌بندی با debounce.
 *
 * - از SearchInput canonical primitive استفاده می‌کند
 * - debounce ۳۰۰ms + useTransition برای navigation نرم
 */
export function SearchCategories() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [_isPending, startTransition] = useTransition();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams],
  );

  const debouncedSearch = useDebouncedCallback((term: string) => {
    startTransition(() => {
      router.push(`${pathname}?${createQueryString('search', term)}`, { scroll: false });
    });
  }, 300);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    debouncedSearch(term);
  };

  return (
    <SearchInput
      value={searchTerm}
      onChange={handleSearch}
      onClear={() => {
        setSearchTerm('');
        debouncedSearch('');
      }}
      placeholder="جستجوی دسته‌بندی…"
      ariaLabel="جستجوی دسته‌بندی"
    />
  );
}
