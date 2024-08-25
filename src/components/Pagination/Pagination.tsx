import type React from 'react';
import twFocusClass from '@/utils/twFocusClass';
import PaginationClient from './PaginationClient';

export interface PaginationProps {
  className?: string;
  currentPage: number;
  totalPages: number;
}

const PaginationServer: React.FC<PaginationProps> = ({
  className = '',
  currentPage,
  totalPages,
}) => {
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
    />
  );
};

export default PaginationServer;
