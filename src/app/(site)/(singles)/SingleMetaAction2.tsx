'use client';

import { savePost } from '@/actions/postActions';
import BookmarkCheck from '@/components/BookmarkCheck';
import ModalReportItem from '@/components/ModalReportItem/ModalReportItem';
import ModalHideAuthor from '@/components/PostActionDropdown/ModalHideAuthor';
import ShareDropdown from '@/components/ShareDropdown/ShareDropdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { useToast } from '@/components/ui/use-toast';
import { getPostLink } from '@/lib/getPostLink';
import { AnimatePresence, motion } from '@/lib/motion-shim';
import type { PostWithRelations } from '@/types/types';
import { useSession } from 'next-auth/react';
import { type FC, forwardRef, useCallback, useState } from 'react';
import { HiExclamationTriangle, HiEyeSlash, HiLink } from 'react-icons/hi2';

export interface SingleMetaAction2Props {
  className?: string;
  post: PostWithRelations;
}

const SingleMetaAction2: FC<SingleMetaAction2Props> = ({ className = '', post }) => {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [showModalHideAuthor, setShowModalHideAuthor] = useState(false);

  // ساخت URL کامل پست
  const getFullUrl = useCallback(() => {
    const postLink = getPostLink(post.postType, post.slug);
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${postLink}`;
    }
    return postLink;
  }, [post.postType, post.slug]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(getFullUrl());
    setIsCopied(true);
    toast({
      title: 'کپی شد!',
      description: 'لینک در کلیپ‌بورد کپی شد',
      variant: 'success',
    });
    setTimeout(() => setIsCopied(false), 2000);
  }, [getFullUrl, toast]);

  const isOwnPost = session?.user?.id === post.authorId;

  return (
    <motion.div
      className={`nc-SingleMetaAction2 ${className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="flex flex-row items-center gap-1.5 sm:gap-2">
        {/* Divider */}
        <div className="hidden sm:block px-1.5">
          <div className="w-px h-5 bg-gradient-to-b from-transparent via-neutral-300 to-transparent dark:via-neutral-600" />
        </div>

        {/* Copy Link Button - Mobile */}
        <ActionButton onClick={copyLink} className="sm:hidden" tooltip="کپی لینک">
          <Icon name="Link" className="size-4" />
        </ActionButton>

        {/* Desktop Elements */}
        <div className="hidden sm:flex items-center gap-1.5">
          {/* Bookmark Button */}
          <BookmarkCheck post={post}>
            {(isBookmarked) => <BookmarkButton postId={post.id} initialBookmarked={isBookmarked} />}
          </BookmarkCheck>

          {/* Share Dropdown */}
          <ShareDropdown url={getFullUrl()} title={post.title}>
            <ActionButton tooltip="اشتراک‌گذاری">
              <Icon name="Share" className="size-[18px]" />
            </ActionButton>
          </ShareDropdown>

          {/* More Actions Dropdown */}
          <DropdownMenu dir="rtl" modal={false}>
            <DropdownMenuTrigger asChild>
              <ActionButton tooltip="بیشتر">
                <Icon name="MoreHorizontal" className="size-[18px]" />
              </ActionButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="min-w-[200px] p-2 rounded-2xl border-neutral-200/60 dark:border-neutral-700/60 shadow-xl"
            >
              <DropdownMenuItem
                onClick={copyLink}
                className="gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                  <HiLink className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="font-medium text-neutral-700 dark:text-neutral-200">
                  {isCopied ? 'لینک کپی شد!' : 'کپی لینک'}
                </span>
                {isCopied && <Icon name="Check" className="size-4 text-emerald-500 mr-auto" />}
              </DropdownMenuItem>

              {!isOwnPost && (
                <>
                  <DropdownMenuSeparator className="my-1.5" />
                  <DropdownMenuItem
                    onClick={() => setShowModalHideAuthor(true)}
                    className="gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                      <HiEyeSlash className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="font-medium text-neutral-700 dark:text-neutral-200">
                      پنهان کردن نویسنده
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsReporting(true)}
                    className="gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30">
                      <HiExclamationTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
                    </div>
                    <span className="font-medium text-red-600 dark:text-red-400">گزارش مقاله</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ModalReportItem show={isReporting} onCloseModalReportItem={() => setIsReporting(false)} />
      <ModalHideAuthor
        show={showModalHideAuthor}
        onCloseModalHideAuthor={() => setShowModalHideAuthor(false)}
      />
    </motion.div>
  );
};

// Action Button Component
interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  tooltip?: string;
  isActive?: boolean;
}

const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ children, className = '', tooltip, isActive, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={`
          group relative flex items-center justify-center
          h-9 w-9 sm:h-10 sm:w-10
          rounded-xl
          bg-white/80 dark:bg-neutral-800/80
          backdrop-blur-sm
          border border-neutral-200/60 dark:border-neutral-700/60
          text-neutral-600 dark:text-neutral-300
          hover:bg-neutral-100 dark:hover:bg-neutral-700
          hover:text-neutral-900 dark:hover:text-white
          hover:border-neutral-300 dark:hover:border-neutral-600
          hover:shadow-lg hover:shadow-neutral-200/30 dark:hover:shadow-neutral-900/30
          transition-all duration-200
          active:scale-95
          ${isActive ? 'border-neutral-300 dark:border-neutral-600' : ''}
          ${className}
        `}
        title={tooltip}
        {...props}
      >
        {children}
      </button>
    );
  },
);
ActionButton.displayName = 'ActionButton';

// Bookmark Button Component
interface BookmarkButtonProps {
  postId: string;
  initialBookmarked: boolean;
}

function BookmarkButton({ postId, initialBookmarked }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    setIsPending(true);
    try {
      const result = await savePost(postId);
      if (result.success) {
        setIsBookmarked(!isBookmarked);
        toast({
          title: 'موفقیت',
          description: isBookmarked ? 'از علاقه‌مندی‌ها حذف شد' : 'به علاقه‌مندی‌ها اضافه شد',
          variant: 'success',
        });
      }
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در عملیات',
        variant: 'destructive',
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        group relative flex items-center justify-center
        h-9 w-9 sm:h-10 sm:w-10
        rounded-xl
        backdrop-blur-sm
        border
        transition-all duration-300
        ${isPending ? 'opacity-50 cursor-not-allowed' : ''}
        ${
          isBookmarked
            ? 'text-white border-transparent shadow-lg'
            : 'bg-white/80 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 border-neutral-200/60 dark:border-neutral-700/60 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-lg hover:shadow-neutral-200/30 dark:hover:shadow-neutral-900/30'
        }
      `}
      style={isBookmarked ? {background: 'var(--ds-brand-600)', boxShadow: '0 4px 16px -4px oklch(52% 0.14 162 / 0.4)'} : undefined}
      title={isBookmarked ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isBookmarked ? 'filled' : 'outline'}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Icon
            name="Bookmark"
            className="size-[18px]"
            strokeWidth={isBookmarked ? 0 : 2}
            style={{ fill: isBookmarked ? 'currentColor' : 'none' }}
          />
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}

export default SingleMetaAction2;
