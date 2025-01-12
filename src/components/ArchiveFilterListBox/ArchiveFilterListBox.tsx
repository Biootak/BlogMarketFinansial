'use client';

import type React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
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
  const pathname = usePathname();

  const handleFilterChange = (value: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set('filter', value);
    current.delete('page');
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`${pathname}${query}`);
  };

  return (
    <div className={`nc-ArchiveFilterListBox flex items-center justify-center ${className}`}>
      <div className="flex items-center justify-center ">
        <Select dir="rtl" onValueChange={handleFilterChange} defaultValue={initialFilter}>
          <SelectTrigger className="w-full md:w-[180px] text-center relative">
            <SelectValue className="absolute inset-0 flex items-center justify-center" />
          </SelectTrigger>
          <SelectContent className="w-full md:w-[180px]">
            {filters.map((item) => (
              <SelectItem
                key={item.name}
                value={item.name}
                className="text-center flex items-center justify-center"
              >
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ArchiveFilterListBox;
