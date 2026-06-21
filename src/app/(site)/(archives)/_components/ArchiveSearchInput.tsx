'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';

interface ArchiveSearchInputProps {
  initialQuery?: string;
  /** ثابت — تا میانبر `/` در FilterRail بتونه فوکوس کنه */
  inputId?: string;
}

/** id ثابت برای هدف‌گیری فوکوس از میانبر صفحه‌کلید */
export const ARCHIVE_SEARCH_INPUT_ID = 'archive-search-input';

export default function ArchiveSearchInput({
  initialQuery = '',
  inputId = ARCHIVE_SEARCH_INPUT_ID,
}: ArchiveSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed.length >= 2) {
        params.set('q', trimmed);
        params.delete('page');
      } else {
        params.delete('q');
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams],
  );

  // جستجوی زنده با debounce — حس command-center
  useEffect(() => {
    if (query === initialQuery) return;
    if (query.trim().length === 1) return; // منتظر ۲ کاراکتر بمون
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, initialQuery, runSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className="arc-search-field-v4" aria-label="جستجو در مقالات">
      <Search className="arc-search-field-v4__icon w-4 h-4" strokeWidth={1.5} aria-hidden />
      <input
        id={inputId}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && query) {
            e.preventDefault();
            handleClear();
          }
        }}
        placeholder="جستجو در مقالات…"
        className="arc-search-field-v4__input"
        autoComplete="off"
        spellCheck={false}
        aria-label="جستجو در مقالات"
      />
      <span className="arc-search-field-v4__trailing">
        {isPending ? (
          <span
            className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-60"
            aria-hidden
          />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="arc-search-field-v4__clear arc-focus"
            aria-label="پاک کردن جستجو"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        ) : (
          <kbd className="arc-search-kbd" aria-hidden>
            /
          </kbd>
        )}
      </span>
    </form>
  );
}
