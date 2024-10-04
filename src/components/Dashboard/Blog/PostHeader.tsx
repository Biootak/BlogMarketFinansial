'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { HiOutlinePlus } from 'react-icons/hi2';
import ButtonPrimary from '@/components/Button/ButtonPrimary';
import FilterDropdown from './FilterDropdown';
import type { PostStatus } from '@prisma/client';

export default function PostHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilter = (filter: 'همه' | PostStatus) => {
    const params = new URLSearchParams(searchParams);
    if (filter !== 'همه') {
      params.set('filter', filter);
    } else {
      params.delete('filter');
    }
    router.push(`/dashboard/posts?${params.toString()}`);
  };

  return (
    <div className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-lg transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center space-x-4 space-x-reverse">
            <FilterDropdown onFilter={handleFilter} />
          </div>
          <Link href="/dashboard/posts/create" className="w-auto">
            <ButtonPrimary
              aria-label="افزودن پست جدید"
              className="bg-transparent border border-primary-500 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-200 sm:bg-gradient-to-l sm:from-primary-500 sm:to-secondary-500 sm:hover:from-primary-600 sm:hover:to-secondary-600 sm:text-white font-medium py-2 px-3 sm:px-6 rounded-md sm:rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <HiOutlinePlus
                className="inline-block ml-0 sm:ml-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-300"
                aria-hidden="true"
              />
              <span className="hidden sm:inline group-hover:mr-2 transition-all duration-300">
                افزودن پست جدید
              </span>
            </ButtonPrimary>
          </Link>
        </div>
      </div>
    </div>
  );
}
