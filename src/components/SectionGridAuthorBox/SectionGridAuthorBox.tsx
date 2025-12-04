import React, { type FC, memo } from 'react';
import CardAuthorBox from '@/components/CardAuthorBox/CardAuthorBox';
import Heading from '@/components/Heading/Heading';
import type { TopAuthor } from '@/actions/getTopAuthors';

export interface SectionGridAuthorBoxProps {
  className?: string;
  authors: TopAuthor[];
}

const SectionGridAuthorBox: FC<SectionGridAuthorBoxProps> = ({ className = '', authors }) => {
  const topAuthors = authors
    .sort((a, b) => (b._count?.posts ?? 0) - (a._count?.posts ?? 0))
    .slice(0, 5);

  if (topAuthors.length === 0) {
    return null;
  }

  return (
    <div className={`nc-SectionGridAuthorBox relative ${className}`}>
      <Heading desc="رتبه‌بندی بر اساس نظرات مشتریان" isCenter>
        5 نویسنده برتر ماه
      </Heading>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8 ">
        {topAuthors.map((author) => (
          <CardAuthorBox key={author.id} author={author} />
        ))}
      </div>
    </div>
  );
};

export default SectionGridAuthorBox;
