'use client';

import React, { useMemo, type FC } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineShare, HiOutlineBookmark } from 'react-icons/hi2';
import PostActionDropdown from '@/components/PostActionDropdown/PostActionDropdown';
import PostCardLikeAndComment from '@/components/PostCardLikeAndComment/PostCardLikeAndComment';
import NcDropDown from '@/components/NcDropDown/NcDropDown';
import NcBookmark from '@/components/NcBookmark/NcBookmark';
import type { PostWithRelations, NcDropDownItem } from '@/types/types';
import { useSession } from 'next-auth/react';
import { sharePost } from '@/actions/shareAction';
import { useShareStore } from '@/hooks/shareStore';
import { SOCIALS_DATA } from '@/components/SocialsShare/SocialsShare';
import { socialToDropdownItem } from '@/lib/utils';


export interface SingleMetaAction2Props {
  className?: string;
  post: PostWithRelations;
}

const SingleMetaAction2: FC<SingleMetaAction2Props> = ({ className = '', post }) => {
  const { savedBy } = post;
  const { data: session } = useSession();
  const { isSharing, setIsSharing } = useShareStore();

  const initialBookmarked = useMemo(() => {
    if (!session?.user?.id) return false;
    return (savedBy ?? []).some((save) => save.userId === session.user.id);
  }, [savedBy, session?.user?.id]);

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

  const socialDropdownItems: NcDropDownItem[] = useMemo(
    () => SOCIALS_DATA.map((social) => socialToDropdownItem(social, handleShare)),
    [post.id],
  );

  return (
    <motion.div
      className={`nc-SingleMetaAction2 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-row space-x-2.5 rtl:space-x-reverse items-center">
        <PostCardLikeAndComment
          itemClass="px-4 h-9 text-sm"
          hiddenCommentOnMobile
          useOnSinglePage
          className="!space-x-2.5 rtl:!space-x-reverse"
          post={post}
        />
        <div className="px-1">
          <div className="border-s border-neutral-200 dark:border-neutral-700 h-6" />
        </div>

        <NcBookmark
          containerClassName="h-9 w-9 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 rounded-full flex items-center justify-center"
          postId={post.id}
          initialBookmarked={initialBookmarked}
        />
        <NcDropDown
          className="flex-shrink-0 flex items-center justify-center focus:outline-none h-9 w-9 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-full"
          renderTrigger={() => <HiOutlineShare className="w-5 h-5" />}
          data={socialDropdownItems}
          onClick={(item) => item.onClick && item.onClick()}
        />
        <PostActionDropdown
          containerClassName="h-9 w-9 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-full"
          iconClass="h-5 w-5"
          post={post}
        />
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
