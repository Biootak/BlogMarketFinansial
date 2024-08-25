import type { FC } from 'react';
import PostCardSaveAction from '@/components/PostCardSaveAction/PostCardSaveAction';
import NcImage from '@/components/NcImage/NcImage';
import NextPrev from '@/components/NextPrev/NextPrev';
import PostCardLikeAndComment from '@/components/PostCardLikeAndComment/PostCardLikeAndComment';
import CardAuthor2 from '@/components/CardAuthor2/CardAuthor2';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostTypeFeaturedIcon from '@/components/PostTypeFeaturedIcon/PostTypeFeaturedIcon';
import Link from 'next/link';
import type { PostWithRelations } from '@/types/types';
import { useSession } from 'next-auth/react';
import CardSkeleton from '../Skeletons/CardSkeleton';
import BookmarkCheck from '../BookmarkCheck';

export interface CardLarge1Props {
  className?: string;
  post: PostWithRelations;
  onClickNext?: () => void;
  onClickPrev?: () => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

const CardLarge1: FC<CardLarge1Props> = ({
  className = '',
  post,
  onClickNext = () => {},
  onClickPrev = () => {},
  onKeyDown,
}) => {
  const { featuredImage, title, categories, slug, postType } = post;

  if (!post || !post.author) {
    return <CardSkeleton className={className} />;
  }

  return (
    <div
      className={`nc-CardLarge1 nc-CardLarge1--hasAnimation relative flex flex-col-reverse md:flex-row justify-end ${className}`}
      onKeyDown={onKeyDown}
    >
      <div className="md:absolute z-10 md:start-0 md:top-1/2 md:-translate-y-1/2 w-full -mt-8 md:mt-0 px-3 sm:px-6 md:px-0 md:w-3/5 lg:w-1/2 xl:w-2/5">
        <div className="nc-CardLarge1__left p-4 sm:p-8 xl:py-14 md:px-10 bg-white/40 dark:bg-neutral-900/40 backdrop-filter backdrop-blur-lg shadow-lg dark:shadow-2xl rounded-3xl space-y-3 sm:space-y-5 ">
          <CategoryBadgeList categories={categories} />

          <h2 className="nc-card-title text-base sm:text-xl lg:text-2xl font-semibold ">
            <Link href={`/single/${slug}`} className="line-clamp-2" title={title}>
              {title}
            </Link>
          </h2>

          {post && <CardAuthor2 className="relative" post={post} />}

          <div className="flex items-center justify-between mt-auto">
            <PostCardLikeAndComment post={post} />
            <BookmarkCheck post={post}>
              {(isBookmarked) => (
                <PostCardSaveAction
                  className="relative"
                  postId={post.id}
                  initialBookmarked={isBookmarked}
                  bookmarkClass="h-8 w-8 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                />
              )}
            </BookmarkCheck>
          </div>
        </div>
        <div className="p-4 sm:pt-8 sm:px-10">
          <NextPrev
            btnClassName="w-11 h-11 text-xl"
            onClickNext={onClickNext}
            onClickPrev={onClickPrev}
          />
        </div>
      </div>
      <div className="w-full md:w-4/5 lg:w-2/3">
        <Link href={`/single/${slug}`} className="nc-CardLarge1__right block relative">
          <NcImage
            containerClassName="aspect-w-16 aspect-h-12 sm:aspect-h-9 md:aspect-h-14 lg:aspect-h-10 2xl:aspect-h-9 relative"
            className="absolute inset-0 object-cover rounded-3xl"
            src={featuredImage || '/placeholder.jpg'}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
          {postType && (
            <PostTypeFeaturedIcon
              className="absolute top-3 start-3 w-8 h-8 md:w-10 md:h-10"
              postType={postType}
            />
          )}
        </Link>
      </div>
    </div>
  );
};

export default CardLarge1;
