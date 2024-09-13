'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
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
    <div className="w-full sm:w-auto relative mt-4 sm:mt-0">
      <Input
        type="text"
        placeholder="جستجوی دسته‌بندی..."
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full sm:w-64 pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 focus:border-primary-500 dark:focus:border-primary-400"
      />
      <HiMagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
      {isPending && (
        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-neutral-500">
          در حال جستجو...
        </span>
      )}
    </div>
  );
}
