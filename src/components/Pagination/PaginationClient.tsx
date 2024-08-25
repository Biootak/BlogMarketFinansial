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
        className={`inline-flex w-11 h-11 items-center justify-center rounded-full ${
          i === currentPage
            ? 'bg-primary-6000 text-white'
            : 'bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-6000 dark:text-neutral-400 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-700'
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
          className={`inline-flex w-11 h-11 items-center justify-center rounded-full ${
            currentPage === 1 || isPending
              ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
              : 'bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-6000 dark:text-neutral-400 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-700'
          } ${twFocusClass()} ${isPending ? 'opacity-50' : ''}`}
          onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || isPending}
        >
          {'<'}
        </button>
        {renderPageNumbers()}
        <button
          type="button"
          className={`inline-flex w-11 h-11 items-center justify-center rounded-full ${
            currentPage === totalPages || isPending
              ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
              : 'bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-6000 dark:text-neutral-400 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-700'
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
