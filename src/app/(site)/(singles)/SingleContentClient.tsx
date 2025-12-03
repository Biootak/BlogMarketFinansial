'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Tag from '@/components/Tag/Tag';
import SingleAuthor from './SingleAuthor';
import SingleCommentForm from './SingleCommentForm';
import SingleCommentLists from './SingleCommentLists';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import PostCardLikeAction from '@/components/PostCardLikeAction/PostCardLikeAction';
import PostCardCommentBtn from '@/components/PostCardCommentBtn/PostCardCommentBtn';
import { HiArrowUp } from 'react-icons/hi2';
import type { PostWithRelations } from '@/types/types';
import MarkdownRenderer from './MarkdownRenderer';
import EditorContentRenderer from '@/components/Editor1/EditorContentRenderer';
import { Button } from '@/components/ui/button';
import '@/components/Editor1/styles/renderer.scss';

interface SingleContentClientProps {
  post: PostWithRelations;
  initialLiked: boolean;
  initialLikeCount: number;
  commentCount: number;
}

const SingleContentClient = ({
  post,
  initialLiked,
  initialLikeCount,
  commentCount,
}: SingleContentClientProps) => {
  const endedAnchorRef = useRef<HTMLDivElement>(null!);
  const contentRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLButtonElement>(null);
  const [isShowScrollToTop, setIsShowScrollToTop] = useState<boolean>(false);

  const endedAnchorEntry = useIntersectionObserver(endedAnchorRef as React.RefObject<Element>, {
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

    setIsShowScrollToTop(scrolled >= 100);
  }, []);

  useEffect(() => {
    const handleProgressIndicatorHeadEvent = () => {
      window.requestAnimationFrame(handleProgressIndicator);
    };
    window.addEventListener('scroll', handleProgressIndicatorHeadEvent, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleProgressIndicatorHeadEvent);
    };
  }, [handleProgressIndicator]);

  const showLikeAndCommentSticky =
    !endedAnchorEntry?.intersectionRatio && (endedAnchorEntry?.boundingClientRect.top || 0) > 0;

  const handleCommentSubmit = (content: string) => {
    console.log('نظر جدید:', content);
    // اینجا می‌توانید هر عملیات دیگری که پس از ارسال نظر نیاز دارید انجام دهید
  };

  return (
    <div className="relative">
      <div className="nc-SingleContent space-y-10">
        <div
          id="single-entry-content"
          className="!max-w-screen-md mx-auto"
          ref={contentRef}
        >
          {post.content ? (
            // Check content format: JSON, HTML, or Markdown
            (() => {
              const content = post.content as string;
              
              // Try to parse as JSON first (new format)
              try {
                const parsed = JSON.parse(content);
                if (parsed && parsed.type === 'doc') {
                  // TipTap JSON content
                  return <EditorContentRenderer content={parsed} />;
                }
              } catch {
                // Not JSON, continue to check other formats
              }
              
              // Check if it's HTML (starts with < tag)
              if (content.trim().startsWith('<')) {
                // HTML content - render directly with styles
                return (
                  <div 
                    className="editor-content prose lg:prose-lg dark:prose-invert"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: Legacy HTML content
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                );
              }
              
              // Markdown content
              return (
                <div className="prose lg:prose-lg dark:prose-invert">
                  <MarkdownRenderer content={content} />
                </div>
              );
            })()
          ) : (
            <p>محتوایی برای نمایش وجود ندارد.</p>
          )}
        </div>

        <div className="max-w-screen-md mx-auto flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Tag key={tag.id} tag={tag} postCount={post._count?.tags} hideCount={true} />
          ))}
        </div>

        <div className="max-w-screen-md mx-auto border-b border-t border-neutral-100 dark:border-neutral-700" />
        <div className="max-w-screen-md mx-auto ">
          <SingleAuthor author={post.author} />
        </div>

        <div id="comments" className="scroll-mt-20 max-w-screen-md mx-auto pt-2">
          <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
            نظرات ({post._count.comments})
          </h3>
          <SingleCommentForm postId={post.id} onClickSubmit={handleCommentSubmit} />
        </div>

        <div className="max-w-screen-md mx-auto">
          {post.comments && post.comments.length > 0 ? (
            <SingleCommentLists comments={post.comments} />
          ) : null}
          <div ref={endedAnchorRef} />
        </div>
      </div>

      <div
        className={`sticky mt-8 bottom-8 z-40 justify-center ${
          showLikeAndCommentSticky ? 'flex' : 'hidden'
        }`}
      >
        <div className="bg-white dark:bg-neutral-800 shadow-lg rounded-full ring-1 ring-offset-1 ring-neutral-900/5 p-1.5 flex items-center justify-center gap-2 text-xs">
          <PostCardLikeAction
            className="px-3 h-9 text-xs"
            postId={post.id}
            initialLikeCount={initialLikeCount}
            initialLiked={initialLiked}
          />
          <div className="border-s h-4 border-neutral-200 dark:border-neutral-700" />
          <PostCardCommentBtn
            isATagOnSingle
            className="flex px-3 h-9 text-xs"
            postSlug={post.slug}
            commentCount={commentCount}
          />
          <div className="border-s h-4 border-neutral-200 dark:border-neutral-700" />

          <Button
            variant="outline"
            size="icon"
            className={`w-9 h-9 p-0 flex items-center justify-center ${
              isShowScrollToTop
                ? 'bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                : ''
            } rounded-full`}
            onClick={() => isShowScrollToTop && window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to top"
          >
            {isShowScrollToTop ? (
              <HiArrowUp className="w-4 h-4" />
            ) : (
              <span ref={progressRef} className="text-xs">
                %
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SingleContentClient;