'use client';

import { useState, useEffect } from 'react';
import { HiMagnifyingGlass } from 'react-icons/hi2';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSearch: (term: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'جستجو در عنوان‌ها...',
  className,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    onSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);

  return (
    <div className={cn('relative flex-1 max-w-sm w-full', className)}>
      <Input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full py-2 pl-10 pr-4 text-sm text-neutral-900 bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-150 ease-in-out dark:bg-neutral-800 dark:text-white dark:border-neutral-600 dark:focus:ring-primary-400 text-right"
        aria-label={placeholder}
        dir="rtl"
      />
      <HiMagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5 dark:text-neutral-500" />
    </div>
  );
};

export default SearchBar;