import Card10 from '@/components/Card10/Card10';
import Card10V3 from '@/components/Card10/Card10V3';
import Heading from '@/components/Heading/Heading';
import type { PostWithRelations } from '@/types/types';

import React, { type FC } from 'react';

export interface SectionMagazine7Props {
  posts: PostWithRelations[];
  className?: string;
}

const SectionMagazine7: FC<SectionMagazine7Props> = ({ posts = [], className = '' }) => {
  return (
    <div className={`nc-SectionMagazine7 relative ${className}`}>
      <Heading desc={`بیش از ${posts.length} مقاله با گالری`}>{'مرور محتواهای دیدنی'}</Heading>

      <div className={'grid grid-cols-1 gap-6 md:gap-8'}>
        <div className={'grid gap-6 md:gap-8 lg:grid-cols-2'}>
          {posts.slice(0, 2).map((post, index) => (
            <Card10V3 key={post.id} post={post} galleryType={index === 1 ? 2 : undefined} />
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 mt-3">
          {posts.slice(2, 6).map((post) => (
            <Card10 key={post.id} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SectionMagazine7;
