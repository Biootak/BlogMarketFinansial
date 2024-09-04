'use client';

import type React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ArchiveFilterListBoxProps {
  className?: string;
  filters: { name: string }[];
  initialFilter: string;
}

const ArchiveFilterListBox: React.FC<ArchiveFilterListBoxProps> = ({
  className = '',
  filters,
  initialFilter,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (value: string) => {
    const current = new URLSearchParams(searchParams.toString());
    current.set('filter', value);
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`/archive${query}`);
  };

  return (
    <div className={`nc-ArchiveFilterListBox w-full ${className}`}>
      <Select dir="rtl" onValueChange={handleFilterChange} defaultValue={initialFilter}>
        <SelectTrigger className="w-full md:w-[180px] text-center">
          <SelectValue placeholder="انتخاب فیلتر" />
        </SelectTrigger>
        <SelectContent className="archive-filter-content text-center">
          {filters.map((item) => (
            <SelectItem key={item.name} value={item.name}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ArchiveFilterListBox;
