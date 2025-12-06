'use client';

import { DashboardSearchInput } from '@/components/Dashboard/shared/DashboardTableWrapper';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export default function SearchCategories() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [isPending, startTransition] = useTransition();

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
    <div className="relative">
      <DashboardSearchInput
        value={searchTerm}
        onChange={handleSearch}
        placeholder="جستجوی دسته‌بندی..."
      />
      {isPending && (
        <span className="absolute -bottom-5 right-0 text-xs text-neutral-500">در حال جستجو...</span>
      )}
    </div>
  );
}
