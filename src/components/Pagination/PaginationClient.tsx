'use client';

import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useTransition } from 'react';

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

  if (totalPages <= 1) return null;

  return (
    <nav aria-label="صفحه‌بندی" className={cn('arc-pagination-modern', className)}>
      {/* Next — در RTL سمت راست قرار می‌گیرد */}
      <button
        type="button"
        className={cn(
          'arc-pagination-modern__item',
          (currentPage === totalPages || isPending) && 'opacity-40 pointer-events-none',
        )}
        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages || isPending}
        aria-label="صفحه بعدی"
      >
        <ChevronRight className="w-4 h-4" aria-hidden />
      </button>

      {/* Pages — direction:ltr فقط روی اعداد تا ۱→۲→۳ درست نمایش داده شود */}
      <span style={{ display: 'contents', direction: 'ltr' }}>
        {pageNumbers.map((i) => (
          <button
            type="button"
            key={i}
            aria-current={i === currentPage ? 'true' : undefined}
            className={cn('arc-pagination-modern__item', 'tabular-nums', isPending && 'opacity-60')}
            onClick={() => handlePageChange(i)}
            disabled={isPending}
          >
            {i}
          </button>
        ))}
      </span>

      {/* Prev — در RTL سمت چپ قرار می‌گیرد */}
      <button
        type="button"
        className={cn(
          'arc-pagination-modern__item',
          (currentPage === 1 || isPending) && 'opacity-40 pointer-events-none',
        )}
        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
        disabled={currentPage === 1 || isPending}
        aria-label="صفحه قبلی"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden />
      </button>
    </nav>
  );
};

export default PaginationClient;
