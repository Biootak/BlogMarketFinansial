'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface LoadMoreButtonProps {
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
}

export default function LoadMoreButton({ onLoadMore, isLoading, hasMore }: LoadMoreButtonProps) {
  return (
    <div className="flex justify-center space-x-4 rtl:space-x-reverse">
      {hasMore && (
        <Button onClick={onLoadMore} disabled={isLoading}>
          {isLoading ? 'در حال بارگذاری...' : 'بارگذاری بیشتر'}
        </Button>
      )}
      <Link href="/archive" passHref>
        <Button variant="outline">مشاهده همه</Button>
      </Link>
    </div>
  );
}
