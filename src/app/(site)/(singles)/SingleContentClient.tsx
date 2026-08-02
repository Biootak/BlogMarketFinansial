'use client';

import PostCardCommentBtn from '@/components/PostCardCommentBtn/PostCardCommentBtn';
import Tag from '@/components/Tag/Tag';
import type { Advertisement, PostWithRelations } from '@/types/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HiArrowUp, HiChatBubbleLeftRight, HiHashtag } from 'react-icons/hi2';
import SingleAuthor from './SingleAuthor';
import SingleCommentForm from './SingleCommentForm';
import SingleCommentLists from './SingleCommentLists';
import '@/components/Editor1/styles/renderer.scss';
import ShareDropdown from '@/components/ShareDropdown/ShareDropdown';
import { getPostLink } from '@/lib/getPostLink';
import { HiShare } from 'react-icons/hi2';

interface SingleContentClientProps {
  post: PostWithRelations;
  commentCount: number;
  inContentAd?: Advertisement | null;
  /**
   * Server-rendered article body. Passing the body through the RSC children
   * slot keeps the TipTap/markdown rendering pipeline on the server — it is
   * serialized to static HTML, never shipped as client JS.
   */
  children: React.ReactNode;
}

const SingleContentClient = ({
  post,
  commentCount,
  inContentAd,
  children,
}: SingleContentClientProps) => {
  // ساخت URL کامل پست
  const getFullUrl = useCallback(() => {
    const postLink = getPostLink(post.postType, post.slug);
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${postLink}`;
    }
    return postLink;
  }, [post.postType, post.slug]);

  // biome-ignore lint/style/noNonNullAssertion: ref is guaranteed non-null — element is always mounted when hook is used
  const endedAnchorRef = useRef<HTMLDivElement>(null!);
  const contentRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLButtonElement>(null);
  const [isShowScrollToTop, setIsShowScrollToTop] = useState<boolean>(false);
  // Sticky action bar visibility — true only once the reader has scrolled to
  // (or past) the end of the article body. Derived in the scroll handler below
  // (same source as the progress %), not a separate IntersectionObserver, so
  // it can't drift from what the reader actually sees.
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Height of the content block is measured once via ResizeObserver (no layout
  // read on every scroll frame). Scroll progress updates a CSS variable on the
  // progress button — zero React re-renders during scroll. The only state
  // writes (isShowScrollToTop, showStickyBar) are guarded so they fire only on
  // threshold crossings, not on every frame.
  const totalEntryHRef = useRef(0);

  useEffect(() => {
    const entryContent = contentRef.current;
    const progressBarContent = progressRef.current;
    if (!entryContent || !progressBarContent) return;

    const measure = () => {
      totalEntryHRef.current = entryContent.offsetTop + entryContent.offsetHeight;
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(entryContent);

    let lastPct = '';
    const onScroll = () => {
      const totalEntryH = totalEntryHRef.current || 1;
      const scrolled = (window.scrollY / totalEntryH) * 100;
      // Update the leaf % label only when the integer digit changes — a
      // textContent write on this one span is cheap and never re-renders React.
      const pct = `${Math.min(99, Math.floor(scrolled))}%`;
      if (pct !== lastPct) {
        lastPct = pct;
        progressBarContent.textContent = pct;
      }
      // Threshold state update — only on crossing the 100% boundary.
      const atBottom = scrolled >= 100;
      setIsShowScrollToTop((prev) => (prev === atBottom ? prev : atBottom));
      // Sticky bar: visible once the reader has actually scrolled and the end
      // of the content block reaches the bottom of the viewport.
      // (scrollY + innerHeight >= contentEnd). The scrollY > 0 guard keeps it
      // hidden on initial mount (content height may not be measured yet).
      const nearEnd = window.scrollY > 0 && window.scrollY + window.innerHeight >= totalEntryH;
      setShowStickyBar((prev) => (prev === nearEnd ? prev : nearEnd));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      ro.disconnect();
    };
  }, []);

  // Placeholder: comment submission is handled by CommentForm's own Server Action.
  // This handler is kept for compatibility with the CommentSection callback prop.
  const handleCommentSubmit = (_content: string) => {
    // intentionally empty — CommentForm submits via Server Action
  };

  return (
    <div className="relative">
      <div className="nc-SingleContent space-y-12 lg:space-y-16">
        {/* Article Content — server-rendered via RSC children slot */}
        <div id="single-entry-content" className="max-w-3xl mx-auto" ref={contentRef}>
          {/* Content Card */}
          <div className="relative">
            {/* Decorative Side Line */}
            <div className="absolute end-0 top-8 bottom-8 w-1 bg-gradient-to-b from-[--ds-brand-500]/50 via-[--ds-brand-500]/20 to-transparent rounded-full hidden lg:block" />

            <div className="lg:pe-8">{children}</div>
          </div>
        </div>

        {/* Tags Section */}
        {post.tags.length > 0 && (
          <div className="max-w-full">
            <div className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-neutral-50/80 to-white/80 dark:from-neutral-900/80 dark:to-neutral-800/80 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-700/50">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <span
                  className="flex items-center justify-center w-10 h-10 rounded-xl shadow-lg"
                  style={{
                    background: 'var(--ds-brand-600)',
                    boxShadow: '0 8px 24px -4px oklch(52% 0.14 162 / 0.35)',
                  }}
                >
                  <HiHashtag className="w-5 h-5 text-white" />
                </span>
                <h4 className="text-lg font-bold text-neutral-900 dark:text-white">
                  برچسب‌های مرتبط
                </h4>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-3">
                {post.tags.map((tag) => (
                  <Tag key={tag.id} tag={tag} postCount={post._count?.tags} hideCount={true} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="max-w-full">
          <div className="relative h-px">
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-neutral-200 dark:via-neutral-700 to-transparent" />
          </div>
        </div>

        {/* Author Section */}
        <div className="max-w-full">
          <SingleAuthor author={post.author} />
        </div>

        {/* Comments Section */}
        <div id="comments" className="scroll-mt-20 max-w-full">
          {/* Comments Header */}
          <div className="flex items-center gap-4 mb-8">
            <span
              className="flex items-center justify-center w-12 h-12 rounded-2xl shadow-lg"
              style={{
                background: 'var(--ds-brand-600)',
                boxShadow: '0 8px 24px -4px oklch(52% 0.14 162 / 0.35)',
              }}
            >
              <HiChatBubbleLeftRight className="w-6 h-6 text-white" />
            </span>
            <div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">نظرات</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {post._count.comments} نظر ثبت شده
              </p>
            </div>
          </div>

          {/* Comment Form */}
          <SingleCommentForm postId={post.id} onClickSubmit={handleCommentSubmit} />
        </div>

        {/* Comments List */}
        <div className="max-w-full">
          {post.comments && post.comments.length > 0 ? (
            <SingleCommentLists comments={post.comments} />
          ) : null}
          <div ref={endedAnchorRef} />
        </div>
      </div>

      {/* Floating Action Bar */}
      <div
        className={`sticky mt-8 bottom-6 z-40 justify-center ${
          showStickyBar ? 'flex' : 'hidden'
        }`}
      >
        <div className="relative overflow-hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 p-2 flex items-center justify-center gap-1.5">
          {/* Gradient Accent */}
          <div
            className="absolute inset-x-0 top-0 h-0.5"
            style={{
              background:
                'linear-gradient(to left, var(--ds-brand-700), var(--ds-brand-500), var(--ds-brand-100))',
            }}
          />

          <ShareDropdown url={getFullUrl()} title={post.title} side="top" align="center">
            <button
              type="button"
              className="flex items-center gap-2 px-4 h-10 text-sm rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300"
            >
              <HiShare className="w-5 h-5" />
              <span className="font-medium">اشتراک</span>
            </button>
          </ShareDropdown>

          <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700" />

          <PostCardCommentBtn
            isATagOnSingle
            className="flex px-4 h-10 text-sm rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            postSlug={post.slug}
            commentCount={commentCount}
          />

          <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700" />

          <button
            type="button"
            className={`
              w-10 h-10 flex items-center justify-center rounded-xl
              transition-all duration-300
              ${
                isShowScrollToTop
                  ? 'text-white hover:-translate-y-0.5'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }
            `}
            style={
              isShowScrollToTop
                ? {
                    background: 'var(--ds-brand-600)',
                    boxShadow: '0 4px 16px -4px oklch(52% 0.14 162 / 0.4)',
                  }
                : undefined
            }
            onClick={() => isShowScrollToTop && window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="بازگشت به بالا"
          >
            {isShowScrollToTop ? (
              <HiArrowUp className="w-5 h-5" />
            ) : (
              <span ref={progressRef} className="text-xs font-semibold">
                0%
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SingleContentClient;
