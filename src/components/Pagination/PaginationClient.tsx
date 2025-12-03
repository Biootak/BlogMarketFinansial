'use client';

import type React from 'react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import Link from 'next/link';
import twFocusClass from '@/utils/twFocusClass';

interface PaginationClientProps {
  className?: string;
  currentPage: number;
  totalPages: number;
  pageNumbers: number[];
  onPageChange?: (page: number) => void;
  baseUrl?: string;
}

const PaginationClient: React.FC<PaginationClientProps> = ({
  className = '',
  currentPage,
  totalPages,
  pageNumbers,
  onPageChange,
  baseUrl,
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handlePageChange = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
      return;
    }
    startTransition(() => {
      const url = baseUrl ? `${baseUrl}?page=${page}` : `/archive?page=${page}`;
      router.push(url);
    });
  };

  const renderPageNumbers = () => {
    return pageNumbers.map((i) => (
      <button
        type="button"
        key={i}
        className={`inline-flex w-11 h-11 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
          i === currentPage
            ? 'bg-gradient-to-r from-primary-400 to-primary-600 text-white shadow-lg hover:shadow-xl hover:shadow-primary-500/50 scale-110 ring-2 ring-primary-300/50'
            : 'bg-white hover:bg-gradient-to-r hover:from-primary-50 hover:to-primary-100 border border-neutral-200 text-neutral-600 hover:text-primary-600 hover:border-primary-300 hover:scale-105 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700 dark:hover:bg-primary-900/20 dark:hover:text-primary-300 dark:hover:border-primary-700'
        } ${twFocusClass()} ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => handlePageChange(i)}
        disabled={isPending}
      >
        {i}
      </button>
    ));
  };

  return (
    <div className="flex justify-center mt-12">
      <nav
        className={`nc-Pagination inline-flex items-center gap-2 rtl:space-x-reverse text-base font-medium ${className}`}
      >
        <button
          type="button"
          className={`inline-flex w-11 h-11 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
            currentPage === 1 || isPending
              ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-500'
              : 'bg-white hover:bg-gradient-to-r hover:from-primary-50 hover:to-primary-100 border border-neutral-200 text-neutral-600 hover:text-primary-600 hover:border-primary-300 hover:scale-105 shadow-md hover:shadow-lg dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700 dark:hover:bg-primary-900/20 dark:hover:text-primary-300 dark:hover:border-primary-700'
          } ${twFocusClass()} ${isPending ? 'opacity-50' : ''}`}
          onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || isPending}
        >
          <span className="text-lg">‹</span>
        </button>
        {renderPageNumbers()}
        <button
          type="button"
          className={`inline-flex w-11 h-11 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
            currentPage === totalPages || isPending
              ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-500'
              : 'bg-white hover:bg-gradient-to-r hover:from-primary-50 hover:to-primary-100 border border-neutral-200 text-neutral-600 hover:text-primary-600 hover:border-primary-300 hover:scale-105 shadow-md hover:shadow-lg dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700 dark:hover:bg-primary-900/20 dark:hover:text-primary-300 dark:hover:border-primary-700'
          } ${twFocusClass()} ${isPending ? 'opacity-50' : ''}`}
          onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isPending}
        >
          <span className="text-lg">›</span>
        </button>
      </nav>
    </div>
  );
};

export default PaginationClient;
