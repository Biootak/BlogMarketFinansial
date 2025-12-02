import type React from 'react';
import PaginationClient from './PaginationClient';

export interface PaginationProps {
  className?: string;
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  baseUrl?: string;
}

const Pagination: React.FC<PaginationProps> = ({ className = '', currentPage, totalPages, onPageChange, baseUrl }) => {
  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  };

  return (
    <PaginationClient
      className={className}
      currentPage={currentPage}
      totalPages={totalPages}
      pageNumbers={renderPageNumbers()}
      onPageChange={onPageChange}
      baseUrl={baseUrl}
    />
  );
};

export default Pagination;
