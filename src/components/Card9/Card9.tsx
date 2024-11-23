import React, { useMemo, type FC } from 'react';
import type { PostWithRelations } from '@/types/types';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostTypeFeaturedIcon from '@/components/PostTypeFeaturedIcon/PostTypeFeaturedIcon';
import PostFeaturedMedia from '@/components/PostFeaturedMedia/PostFeaturedMedia';
import Link from 'next/link';
import Image from 'next/image';
import { getPostLink } from '@/lib/getPostLink';

export interface Card9Props {
  className?: string;
  ratio?: string;
  post: PostWithRelations;
  hoverClass?: string;
}

const Card9: FC<Card9Props> = ({
  className = 'h-full',
  ratio = 'aspect-w-3 aspect-h-3 sm:aspect-h-4',
  post,
  hoverClass = '',
}) => {
  const { title, slug, featuredImage, categories, author, createdAt, postType } = post;

  const renderMeta = () => (
    <div className="inline-flex items-center text-xs text-neutral-300">
      <div className="block">
        <h3 className="block text-sm font-semibold text-white dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-500">
          <Link href={getPostLink(postType, slug)} className="line-clamp-2" title={title}>
            {title}
          </Link>
        </h3>
        <div className="flex mt-2.5 relative">
          <Link
            href={`/author/${author.id}`}
            className="text-neutral-200 hover:text-white font-medium truncate"
          >
            {author.name}
          </Link>
          <span className="mx-[6px] font-medium">·</span>
          <span className="font-normal truncate">
            {new Date(createdAt).toLocaleDateString('fa-IR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`nc-Card9 relative flex flex-col group rounded-3xl overflow-hidden z-0 ${hoverClass} ${className} rtl`}
    >
      <div className={`flex items-start relative w-full ${ratio}`}>
        {postType === 'AUDIO' ? (
          <div className="absolute inset-0">
            <PostFeaturedMedia post={post} />
          </div>
        ) : (
          <Link href={getPostLink(postType, slug)} className="relative w-full h-full block">
            <Image
              fill
              alt={title}
              className="object-cover rounded-3xl"
              src={featuredImage || '/path/to/default-image.jpg'}
              sizes="(max-width: 600px) 480px, 500px"
            />
            <PostTypeFeaturedIcon
              className="absolute top-3 left-3 group-hover:hidden"
              postType={postType}
              wrapSize="w-7 h-7"
              iconSize="w-4 h-4"
            />
            <span className="absolute inset-0 bg-black bg-opacity-10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        )}
      </div>
      <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black opacity-50" />
      <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col flex-grow">
        <div className="mb-3">
          <CategoryBadgeList categories={categories} />
        </div>
        {renderMeta()}
      </div>
    </div>
  );
};

export default Card9;
