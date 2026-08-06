import Avatar from '@/components/Avatar/Avatar';
import type { FC } from 'react';

import type { PostWithRelations } from '@/types/types';
import Link from 'next/link';
import FormattedDate from '../FormattedDate';

export interface PostCardMetaV2Props {
  meta: Pick<PostWithRelations, 'createdAt' | 'author' | 'title'>;
  hiddenAvatar?: boolean;
  className?: string;
  titleClassName?: string;
  avatarSize?: string;
}

const PostCardMetaV2: FC<PostCardMetaV2Props> = ({
  meta,
  hiddenAvatar = false,
  className = 'leading-none text-xs',
  titleClassName = 'text-base',
  avatarSize = 'h-9 w-9 text-base',
}) => {
  const { createdAt, author, title } = meta;
  return (
    <div
      className={`nc-PostCardMetaV2 inline-flex items-center flex-wrap text-neutral-800 dark:text-neutral-200 ${className}`}
    >
      <div className="relative flex items-center gap-2">
        {!hiddenAvatar && (
          <Avatar
            radius="rounded-full"
            sizeClass={avatarSize}
            imgUrl={author.profile?.avatar || author.image}
            userName={author.name}
          />
        )}
        <div>
          <h2 className={`block font-semibold ${titleClassName}`}>
            {/* WCAG 2.5.3 label-in-name + target-size: aria-label حذف شد تا نام
                دسترس‌پذیر دقیقاً همان متنِ دیده‌شده باشد و با آن تناقض نکند. */}
            <Link href={`/author/${author.id}`} className="line-clamp-1 block py-1.5 -my-1.5">
              {title}
            </Link>
          </h2>

          {/* حداقل ارتفاع ۴۴px touch target — بدون aria-label اضافی تا
              accessible name دقیقاً متنِ دیده‌شده (نام + تاریخ) باشد */}
          <Link href={`/author/${author.id}`} className="flex mt-1.5 min-h-[44px] items-center">
            <span className="block text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white font-medium">
              {author.name}
            </span>
            <span className="text-neutral-600 dark:text-neutral-400 mx-[6px] font-medium">·</span>
            <span className="text-neutral-600 dark:text-neutral-400 font-normal">
              <FormattedDate date={createdAt} />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PostCardMetaV2;
