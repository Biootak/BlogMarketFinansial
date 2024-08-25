'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { HiPlus, HiMagnifyingGlass, HiOutlinePlus } from 'react-icons/hi2';
import { Button } from '@/components/ui/button';
import ButtonPrimary from '@/components/Button/ButtonPrimary';
import SearchBar from '@/components/SearchBar';
import FilterDropdown from './FilterDropdown';
import type { PostStatus } from '@prisma/client';

export default function PostHeader() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set('search', term);
    } else {
      params.delete('search');
    }
    router.push(`/dashboard/admin/posts?${params.toString()}`);
  };

  const handleFilter = (filter: 'همه' | PostStatus) => {
    const params = new URLSearchParams(searchParams);
    if (filter !== 'همه') {
      params.set('filter', filter);
    } else {
      params.delete('filter');
    }
    router.push(`/dashboard/admin/posts?${params.toString()}`);
  };

  return (
    <div className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-lg transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
              >
                <HiMagnifyingGlass className="h-4 w-4" />
              </Button>
              {isSearchOpen && (
                <div className="absolute right-0 mt-2 w-64">
                  <SearchBar onSearch={handleSearch} />
                </div>
              )}
            </div>
            <FilterDropdown onFilter={handleFilter} />
          </div>
          <Link href="/dashboard/admin/posts/create-post" className="w-auto">
          <ButtonPrimary
              aria-label="افزودن پست جدید"
              className="bg-gradient-to-l from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-medium py-2 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <HiOutlinePlus
                className="inline-block ml-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-300"
                aria-hidden="true"
              />
              <span className="group-hover:mr-2 transition-all duration-300">
               افزودن پست جدید
              </span>
            </ButtonPrimary>
          </Link>
        </div>
      </div>
    </div>
  );
}