'use client';

import React, { useMemo, type FC } from 'react';
import { motion } from 'framer-motion';
import PostActionDropdown from '@/components/PostActionDropdown/PostActionDropdown';
import NcDropDown from '@/components/NcDropDown/NcDropDown';
import type { PostWithRelations, NcDropDownItem } from '@/types/types';
import { sharePost } from '@/actions/shareAction';
import { useShareStore } from '@/hooks/shareStore';
import { SOCIALS_DATA } from '@/components/SocialsShare/SocialsShare';
import { socialToDropdownItem } from '@/lib/utils';
import BookmarkCheck from '@/components/BookmarkCheck';
import PostCardSaveAction from '@/components/PostCardSaveAction/PostCardSaveAction';
import { Icon } from '@/components/ui/icon';
import CopyNotification from '@/components/PostMeta2/CopyNotification';

export interface SingleMetaAction2Props {
  className?: string;
  post: PostWithRelations;
}

const SingleMetaAction2: FC<SingleMetaAction2Props> = ({ className = '', post }) => {
  const { isSharing, setIsSharing } = useShareStore();

  const handleShare = async (platform: string) => {
    setIsSharing(true);
    try {
      const result = await sharePost(post.id, platform);
      if (result.success) {
        window.open(result.shareUrl, '_blank');
      }
    } catch (error) {
      console.error('Error sharing post:', error);
    } finally {
      setIsSharing(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const socialDropdownItems: NcDropDownItem[] = useMemo(
    () => SOCIALS_DATA.map((social) => socialToDropdownItem(social, handleShare)),
    [post.id],
  );

  const iconClassName = 'size-4 sm:size-5 text-neutral-700 dark:text-neutral-200';

  return (
    <motion.div
      className={`nc-SingleMetaAction2 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-row gap-2 sm:gap-2.5 items-center">
        <div className="hidden sm:block px-1">
          <div className="border-s border-neutral-200 dark:border-neutral-700 h-6" />
        </div>

        {/* Mobile Copy Link Button */}
        <CopyNotification
          className="sm:hidden flex-shrink-0 flex items-center justify-center focus:outline-none h-4 w-4 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-full"
          iconClassName={iconClassName}
        />

        {/* Desktop Elements */}
        <div className="hidden sm:flex gap-2">
          <BookmarkCheck post={post}>
            {(isBookmarked) => (
              <PostCardSaveAction
                className="relative"
                postId={post.id}
                initialBookmarked={isBookmarked}
                bookmarkClass="h-8 w-8 sm:h-9 sm:w-9 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors duration-300"
              />
            )}
          </BookmarkCheck>
          <NcDropDown
            className="flex-shrink-0 z-50 flex items-center justify-center focus:outline-none h-8 w-8 sm:h-9 sm:w-9 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-full"
            renderTrigger={() => <Icon name="Share" className={iconClassName} />}
            data={socialDropdownItems}
            onClick={(item) => item.onClick?.()}
          />
          <PostActionDropdown
            containerClassName="h-8 w-8 sm:h-9 sm:w-9 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-full"
            iconClass={iconClassName}
            post={post}
          />
        </div>
      </div>
      {isSharing && (
        <motion.div
          className="mt-2 text-sm text-neutral-500"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          اشتراک گذاری...
        </motion.div>
      )}
    </motion.div>
  );
};

export default SingleMetaAction2;
