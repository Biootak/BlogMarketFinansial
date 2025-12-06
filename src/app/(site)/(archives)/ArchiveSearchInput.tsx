'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';

interface ArchiveSearchInputProps {
  initialQuery?: string;
}

export default function ArchiveSearchInput({ initialQuery = '' }: ArchiveSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  const handleSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value.length >= 2) {
        params.set('q', value);
        params.delete('page'); // Reset to page 1
      } else {
        params.delete('q');
      }

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    handleSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجو در مقالات..."
          className="
            w-full h-12 pr-12 pl-12
            bg-white dark:bg-neutral-800
            border border-neutral-200/80 dark:border-neutral-700/80
            rounded-xl
            text-neutral-900 dark:text-white
            placeholder:text-neutral-400 dark:placeholder:text-neutral-500
            focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
            transition-all duration-300
            text-sm
          "
        />
        <button
          type="submit"
          disabled={isPending}
          className="
            absolute right-3 top-1/2 -translate-y-1/2
            w-8 h-8 rounded-lg
            flex items-center justify-center
            bg-primary-50 dark:bg-primary-900/40
            text-primary-600 dark:text-primary-400
            hover:bg-primary-100 dark:hover:bg-primary-900/60
            transition-colors duration-200
          "
        >
          {isPending ? (
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </button>
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="
              absolute left-3 top-1/2 -translate-y-1/2
              w-6 h-6 rounded-full
              flex items-center justify-center
              text-neutral-400 hover:text-neutral-600
              dark:text-neutral-500 dark:hover:text-neutral-300
              hover:bg-neutral-100 dark:hover:bg-neutral-700
              transition-colors duration-200
            "
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {query && query.length < 2 && (
        <p className="absolute -bottom-5 right-0 text-xs text-amber-600 dark:text-amber-400">
          حداقل ۲ کاراکتر وارد کنید
        </p>
      )}
    </form>
  );
}
