'use client';

import React, { type FC, useEffect, useRef, useState, useCallback } from 'react';
import Tag from '@/components/Tag/Tag';
import SingleAuthor from './SingleAuthor';
import SingleCommentForm from './SingleCommentForm';
import SingleCommentLists from './SingleCommentLists';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import PostCardLikeAction from '@/components/PostCardLikeAction/PostCardLikeAction';
import PostCardCommentBtn from '@/components/PostCardCommentBtn/PostCardCommentBtn';
import { HiArrowUp } from 'react-icons/hi2';
import type { PostWithRelations } from '@/types/types';
import { useSession } from 'next-auth/react';
import MarkdownRenderer from './MarkdownRenderer';

export interface SingleContentProps {
  post: PostWithRelations;
}

const SingleContent: FC<SingleContentProps> = ({ post }) => {
  const endedAnchorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLButtonElement>(null);
  const [isShowScrollToTop, setIsShowScrollToTop] = useState<boolean>(false);

  const endedAnchorEntry = useIntersectionObserver(endedAnchorRef, {
    threshold: 0,
    root: null,
    rootMargin: '0%',
    freezeOnceVisible: false,
  });

  const handleProgressIndicator = useCallback(() => {
    const entryContent = contentRef.current;
    const progressBarContent = progressRef.current;

    if (!entryContent || !progressBarContent) {
      return;
    }

    const totalEntryH = entryContent.offsetTop + entryContent.offsetHeight;
    const winScroll = window.scrollY;
    const scrolled = (winScroll / totalEntryH) * 100;

    progressBarContent.innerText = `${scrolled.toFixed(0)}%`;

    if (scrolled >= 100 && !isShowScrollToTop) {
      setIsShowScrollToTop(true);
    } else if (scrolled < 100 && isShowScrollToTop) {
      setIsShowScrollToTop(false);
    }
  }, [isShowScrollToTop]);

  useEffect(() => {
    const handleProgressIndicatorHeadeEvent = () => {
      window.requestAnimationFrame(handleProgressIndicator);
    };
    window.addEventListener('scroll', handleProgressIndicatorHeadeEvent, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleProgressIndicatorHeadeEvent);
    };
  }, [handleProgressIndicator]);

  const showLikeAndCommentSticky =
    !endedAnchorEntry?.intersectionRatio && (endedAnchorEntry?.boundingClientRect.top || 0) > 0;

  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const isLiked =
    currentUserId && post.likes ? post.likes.some((like) => like.userId === currentUserId) : false;

  const likeCount = post._count?.likes ?? 0;
  const commentCount = post._count?.comments ?? 0;

  const handleCommentSubmit = (content: string) => {
    console.log('نظر جدید:', content);
    // اینجا می‌توانید هر عملیات دیگری که پس از ارسال نظر نیاز دارید انجام دهید
  };

  return (
    <>
      <div className="relative">
        <div className="nc-SingleContent space-y-10">
          <div
            id="single-entry-content"
            className="prose lg:prose-lg !max-w-screen-md mx-auto dark:prose-invert"
            ref={contentRef}
          >
            <h1>{post.title}</h1>
            {post.content ? (
              <>
                <MarkdownRenderer content={post.content} />
              </>
            ) : (
              <p>محتوایی برای نمایش وجود ندارد.</p>
            )}
          </div>

          <div className="max-w-screen-md mx-auto flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Tag key={tag.id} tag={tag} postCount={post._count?.tags} />
            ))}
          </div>

          <div className="max-w-screen-md mx-auto border-b border-t border-neutral-100 dark:border-neutral-700" />
          <div className="max-w-screen-md mx-auto ">
            <SingleAuthor author={post.author} />
          </div>

          <div id="comments" className="scroll-mt-20 max-w-screen-md mx-auto pt-5">
            <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
              نظرات ({post._count.comments})
            </h3>
            <SingleCommentForm postId={post.id} onClickSubmit={handleCommentSubmit} />
          </div>

          <div className="max-w-screen-md mx-auto">
            {post.comments && post.comments.length > 0 ? (
              <SingleCommentLists comments={post.comments} />
            ) : (
              <p>هنوز نظری ثبت نشده است.</p>
            )}
            <div ref={endedAnchorRef} />
          </div>
        </div>

        <div
          className={`sticky mt-8 bottom-8 z-40 justify-center ${
            showLikeAndCommentSticky ? 'flex' : 'hidden'
          }`}
        >
          <div className="bg-white dark:bg-neutral-800 shadow-lg rounded-full ring-1 ring-offset-1 ring-neutral-900/5 p-1.5 flex items-center justify-center space-x-2 rtl:space-x-reverse text-xs">
            <PostCardLikeAction
              className="px-3 h-9 text-xs"
              postId={post.id}
              initialLikeCount={likeCount}
              initialLiked={isLiked}
            />
            <div className="border-s h-4 border-neutral-200 dark:border-neutral-700" />
            <PostCardCommentBtn
              isATagOnSingle
              className="flex px-3 h-9 text-xs"
              postId={post.id}
              commentCount={commentCount}
            />
            <div className="border-s h-4 border-neutral-200 dark:border-neutral-700" />

            {isShowScrollToTop && (
              <button
                type="button"
                className="w-9 h-9 items-center justify-center bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 rounded-full"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <HiArrowUp className="w-4 h-4" />
              </button>
            )}

            {!isShowScrollToTop && (
              <button
                type="button"
                ref={progressRef}
                className="w-9 h-9 items-center justify-center"
                title="برو بالا"
              >
                %
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SingleContent;
