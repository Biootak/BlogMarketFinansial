import React, { useMemo, type FC } from 'react';
import PostCardSaveAction from '@/components/PostCardSaveAction/PostCardSaveAction';
import type { PostWithRelations } from '@/types/types';
import PostCardLikeAndComment from '@/components/PostCardLikeAndComment/PostCardLikeAndComment';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostTypeFeaturedIcon from '@/components/PostTypeFeaturedIcon/PostTypeFeaturedIcon';
import PostFeaturedMedia from '@/components/PostFeaturedMedia/PostFeaturedMedia';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

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
  const { id, title, slug, savedBy, featuredImage, categories, author, createdAt, postType } = post;
  const { data: session } = useSession();

  const isBookmarked = useMemo(() => {
    if (!session?.user?.id) return false;
    return savedBy?.some((save) => save.userId === session.user.id) ?? false;
  }, [savedBy, session?.user?.id]);

  const renderMeta = () => (
    <div className="inline-flex items-center text-xs text-neutral-300">
      <div className="block">
        <h2 className="block text-base sm:text-lg font-semibold text-white">
          <span className="line-clamp-2" title={title}>
            {title}
          </span>
        </h2>
        <Link href={`/author/${author.id}`} className="flex mt-2.5 relative">
          <span className="block text-neutral-200 hover:text-white font-medium truncate">
            {author.name}
          </span>
          <span className="mx-[6px] font-medium">·</span>
          <span className="font-normal truncate">
            {new Date(createdAt).toLocaleDateString('fa-IR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </Link>
      </div>
    </div>
  );

  return (
    <div
      className={`nc-Card9 relative flex flex-col group rounded-3xl overflow-hidden z-0 ${hoverClass} ${className} rtl`}
    >
      <div className="absolute inset-x-0 top-0 p-3 flex items-center justify-between transition-all opacity-0 z-[-1] group-hover:opacity-100 group-hover:z-10 duration-300">
        <PostCardLikeAndComment className="relative" post={post} />
        <PostCardSaveAction
          className="relative"
          postId={id}
          initialBookmarked={isBookmarked}
          bookmarkClass="h-8 w-8 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700"
        />
      </div>
      <div className={`flex items-start relative w-full ${ratio}`}>
        {postType === 'AUDIO' ? (
          <div className="absolute inset-0">
            <PostFeaturedMedia post={post} />
          </div>
        ) : (
          <Link href={`/single/${slug}`} className="relative w-full h-full block">
            <div className="w-full h-full relative">
              <Image
                fill
                alt={title}
                className="object-cover rounded-3xl"
                src={featuredImage || '/path/to/default-image.jpg'}
                sizes="(max-width: 600px) 480px, 500px"
              />
            </div>
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
      <Link
        href={`/single/${slug}`}
        className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black opacity-50"
      />
      <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col flex-grow">
        <Link href={`/single/${slug}`} className="absolute inset-0" />
        <div className="mb-3">
          <CategoryBadgeList categories={categories} />
        </div>
        {renderMeta()}
      </div>
    </div>
  );
};

export default Card9;
