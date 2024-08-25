'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ArchiveFilterListBox from '@/components/ArchiveFilterListBox/ArchiveFilterListBox';

interface ArchiveFilterListBoxClientProps {
  filters: { name: string }[];
  initialFilter: string;
  searchParams: { [key: string]: string | undefined };
}

export default function ArchiveFilterListBoxClient({
  filters,
  initialFilter,
  searchParams,
}: ArchiveFilterListBoxClientProps) {
  const router = useRouter();

  const handleFilterChange = (selected: { name: string }) => {
    const newSearchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) {
        newSearchParams.set(key, value);
      }
    }
    newSearchParams.set('filter', selected.name);
    newSearchParams.set('page', '1');
    router.push(`/archive?${newSearchParams.toString()}`);
  };

  return (
    <ArchiveFilterListBox
      className="w-40"
      lists={filters}
      selected={{ name: initialFilter }}
      onChange={handleFilterChange}
    />
  );
}
