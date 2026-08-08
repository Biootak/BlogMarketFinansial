'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { HiMagnifyingGlass } from 'react-icons/hi2';
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
    <div className="at-filterbar__search">
      <input
        type="text"
        placeholder="جستجوی دسته‌بندی…"
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
      />
      <HiMagnifyingGlass className="at-filterbar__search__ico size-4" />
      {isPending && (
        <span className="text-[10px] text-[color:var(--at-fg-subtle)] mt-1 block">
          در حال جستجو…
        </span>
      )}
    </div>
  );
}
