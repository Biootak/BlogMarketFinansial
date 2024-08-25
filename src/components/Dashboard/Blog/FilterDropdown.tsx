'use client';

import { useState } from 'react';
import { HiAdjustmentsHorizontal } from 'react-icons/hi2';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PostStatus } from '@prisma/client';

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
        <Button variant="outline" size="icon">
          <HiAdjustmentsHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {filterOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleFilterChange(option.value)}
            className={selectedFilter === option.value ? 'bg-primary-100 dark:bg-primary-800' : ''}
          >
            {option.name}
            {selectedFilter === option.value && <span className="mr-2">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
