'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PostStatus } from '@prisma/client';
import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

type FilterOption = 'همه' | PostStatus;

const filterOptions: Array<{ name: string; value: FilterOption }> = [
  { name: 'همه', value: 'همه' },
  { name: 'منتشر شده', value: 'PUBLISHED' },
  { name: 'پیش‌نویس', value: 'DRAFT' },
  { name: 'در انتظار بررسی', value: 'PENDING_REVIEW' },
];

interface FilterDropdownProps {
  onFilter: (filter: FilterOption) => void;
}

export default function FilterDropdown({ onFilter }: FilterDropdownProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('همه');

  const handleFilterChange = (filter: FilterOption) => {
    setSelectedFilter(filter);
    onFilter(filter);
  };

  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="hover:bg-neutral-100 dark:hover:bg-neutral-700"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {filterOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleFilterChange(option.value)}
            className={`flex items-center justify-between px-2 py-2 text-sm ${
              selectedFilter === option.value
                ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100'
                : 'text-neutral-700 dark:text-neutral-300'
            } hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-150`}
          >
            {option.name}
            {selectedFilter === option.value && (
              <span className="text-primary-600 dark:text-primary-400">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
