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
}

const PaginationClient: React.FC<PaginationClientProps> = ({
  className = '',
  currentPage,
  totalPages,
  pageNumbers,
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handlePageChange = (page: number) => {
    startTransition(() => {
      router.push(`/archive?page=${page}`);
    });
  };

  const renderPageNumbers = () => {
    return pageNumbers.map((i) => (
      <button
        type="button"
        key={i}
        className={`inline-flex w-11 h-11 items-center justify-center rounded-full text-sm font-medium transition-all duration-200 ${
          i === currentPage
            ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-700'
            : 'bg-white hover:bg-primary-50 border border-neutral-200 text-neutral-600 hover:text-primary-600 hover:border-primary-100 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700 dark:hover:bg-primary-900/50 dark:hover:text-primary-300'
        } ${twFocusClass()} ${isPending ? 'opacity-50' : ''}`}
        onClick={() => handlePageChange(i)}
        disabled={isPending}
      >
        {i}
      </button>
    ));
  };

  return (
    <div className="flex justify-center">
      <nav
        className={`nc-Pagination inline-flex items-center space-x-1 rtl:space-x-reverse text-base font-medium ${className}`}
      >
        <button
          type="button"
          className={`inline-flex w-11 h-11 items-center justify-center rounded-full text-sm font-medium transition-all duration-200 ${
            currentPage === 1 || isPending
              ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-500'
              : 'bg-white hover:bg-primary-50 border border-neutral-200 text-neutral-600 hover:text-primary-600 hover:border-primary-100 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700 dark:hover:bg-primary-900/50 dark:hover:text-primary-300'
          } ${twFocusClass()} ${isPending ? 'opacity-50' : ''}`}
          onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || isPending}
        >
          {'<'}
        </button>
        {renderPageNumbers()}
        <button
          type="button"
          className={`inline-flex w-11 h-11 items-center justify-center rounded-full text-sm font-medium transition-all duration-200 ${
            currentPage === totalPages || isPending
              ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-500'
              : 'bg-white hover:bg-primary-50 border border-neutral-200 text-neutral-600 hover:text-primary-600 hover:border-primary-100 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700 dark:hover:bg-primary-900/50 dark:hover:text-primary-300'
          } ${twFocusClass()} ${isPending ? 'opacity-50' : ''}`}
          onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isPending}
        >
          {'>'}
        </button>
      </nav>
    </div>
  );
};

export default PaginationClient;
