'use client';

import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import s from './categories.module.css';

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
    <div className={s.search}>
      <input
        type="text"
        placeholder="جستجوی دسته‌بندی…"
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        aria-label="جستجوی دسته‌بندی"
      />
      <Search size={15} className={s.searchIcon} aria-hidden />
      {isPending && <span className={s.searchPending}>در حال جستجو…</span>}
    </div>
  );
}
