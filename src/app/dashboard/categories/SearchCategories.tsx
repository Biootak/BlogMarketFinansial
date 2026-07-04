'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { HiMagnifyingGlass } from 'react-icons/hi2';

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
    [searchParams]
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
    <div className="at-filterbar__search" style={{ minWidth: '240px' }}>
      <input
        type="text"
        placeholder="جستجوی دسته‌بندی..."
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
      />
      <HiMagnifyingGlass className="at-filterbar__search__ico size-4" />
      {isPending && (
        <span className="text-[10px] text-[color:var(--at-fg-subtle)] mt-1 block">در حال جستجو...</span>
      )}
    </div>
  );
}