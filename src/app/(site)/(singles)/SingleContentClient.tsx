'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Tag from '@/components/Tag/Tag';
import SingleAuthor from './SingleAuthor';
import SingleCommentForm from './SingleCommentForm';
import SingleCommentLists from './SingleCommentLists';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import PostCardCommentBtn from '@/components/PostCardCommentBtn/PostCardCommentBtn';
import { HiArrowUp, HiHashtag, HiChatBubbleLeftRight } from 'react-icons/hi2';
import type { PostWithRelations, Advertisement } from '@/types/types';
import MarkdownRenderer from './MarkdownRenderer';
import EditorContentRenderer from '@/components/Editor1/EditorContentRenderer';
import BannerAds from '@/components/BannerADS/BannerADS';
import '@/components/Editor1/styles/renderer.scss';
import { HiShare } from 'react-icons/hi2';
import { getPostLink } from '@/lib/getPostLink';
import ShareDropdown from '@/components/ShareDropdown/ShareDropdown';

interface SingleContentClientProps {
  post: PostWithRelations;
  initialLiked: boolean;
  initialLikeCount: number;
  commentCount: number;
  inContentAd?: Advertisement | null;
}

const SingleContentClient = ({
  post,
  commentCount,
  inContentAd,
}: SingleContentClientProps) => {
  // ساخت URL کامل پست
  const getFullUrl = useCallback(() => {
    const postLink = getPostLink(post.postType, post.slug);
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${postLink}`;
    }
    return postLink;
  }, [post.postType, post.slug]);

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
  };

  return (
    <div className="relative">
      <div className="nc-SingleContent space-y-12 lg:space-y-16">
        {/* Article Content */}
        <div
          id="single-entry-content"
          className="max-w-3xl mx-auto"
          ref={contentRef}
        >
          {/* Content Card */}
          <div className="relative">
            {/* Decorative Side Line */}
            <div className="absolute right-0 top-8 bottom-8 w-1 bg-gradient-to-b from-primary-500/50 via-violet-500/30 to-transparent rounded-full hidden lg:block" />
            
            <div className="lg:pr-8">
              {post.content ? (
                (() => {
                  const content = post.content as string;
                  
                  try {
                    const parsed = JSON.parse(content);
                    if (parsed && parsed.type === 'doc') {
                      if (inContentAd && Array.isArray(parsed.content)) {
                        let paragraphCount = 0;
                        let insertIndex = -1;
                        for (let i = 0; i < parsed.content.length; i++) {
                          if (parsed.content[i].type === 'paragraph') {
                            paragraphCount++;
                            if (paragraphCount === 3) {
                              insertIndex = i + 1;
                              break;
                            }
                          }
                        }
                        if (insertIndex !== -1 && insertIndex < parsed.content.length) {
                          const part1 = { ...parsed, content: parsed.content.slice(0, insertIndex) };
                          const part2 = { ...parsed, content: parsed.content.slice(insertIndex) };
                          return (
                            <div className="space-y-6">
                              <EditorContentRenderer content={part1} />
                              <div className="my-6">
                                <BannerAds ad={inContentAd} variant="rich" />
                              </div>
                              <EditorContentRenderer content={part2} />
                            </div>
                          );
                        }
                      }
                      return <EditorContentRenderer content={parsed} />;
                    }
                  } catch {
                    // Not JSON
                  }
                  
                  if (content.trim().startsWith('<')) {
                    const { sanitizeHtml } = require('@/lib/utils');
                    if (inContentAd) {
                      const paragraphs = content.split('</p>');
                      if (paragraphs.length > 3) {
                        const part1 = paragraphs.slice(0, 3).join('</p>') + '</p>';
                        const part2 = paragraphs.slice(3).join('</p>');
                        return (
                          <div className="space-y-6">
                            <div
                              className="editor-content at-prose at-prose--renderer"
                              // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized with DOMPurify
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(part1) }}
                            />
                            <div className="my-6">
                              <BannerAds ad={inContentAd} variant="rich" />
                            </div>
                            <div
                              className="editor-content at-prose at-prose--renderer"
                              // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized with DOMPurify
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(part2) }}
                            />
                          </div>
                        );
                      }
                    }
                    return (
                      <div
                        className="editor-content at-prose at-prose--renderer"
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized with DOMPurify
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
                      />
                    );
                  }

                  if (inContentAd) {
                    const paragraphs = content.split(/\n\s*\n/);
                    if (paragraphs.length > 3) {
                      const part1 = paragraphs.slice(0, 3).join('\n\n');
                      const part2 = paragraphs.slice(3).join('\n\n');
                      return (
                        <div className="space-y-6">
                          <div className="at-prose at-prose--renderer">
                            <MarkdownRenderer content={part1} />
                          </div>
                          <div className="my-6">
                            <BannerAds ad={inContentAd} variant="rich" />
                          </div>
                          <div className="at-prose at-prose--renderer">
                            <MarkdownRenderer content={part2} />
                          </div>
                        </div>
                      );
                    }
                  }

                  return (
                    <div className="at-prose at-prose--renderer">
                      <MarkdownRenderer content={content} />
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                  محتوایی برای نمایش وجود ندارد.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tags Section */}
        {post.tags.length > 0 && (
          <div className="max-w-full">
            <div className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-neutral-50/80 to-white/80 dark:from-neutral-900/80 dark:to-neutral-800/80 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-700/50">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-violet-500 shadow-lg shadow-primary-500/25">
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
            <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-rose-500 shadow-lg shadow-violet-500/25">
              <HiChatBubbleLeftRight className="w-6 h-6 text-white" />
            </span>
            <div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                نظرات
              </h3>
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
          showLikeAndCommentSticky ? 'flex' : 'hidden'
        }`}
      >
        <div className="relative overflow-hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 p-2 flex items-center justify-center gap-1.5">
          {/* Gradient Accent */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-l from-primary-500 via-violet-500 to-rose-500" />
          
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
            className={`
              w-10 h-10 flex items-center justify-center rounded-xl
              transition-all duration-300
              ${isShowScrollToTop
                ? 'bg-gradient-to-br from-primary-500 to-violet-500 text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:-translate-y-0.5'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }
            `}
            onClick={() => isShowScrollToTop && window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to top"
          >
            {isShowScrollToTop ? (
              <HiArrowUp className="w-5 h-5" />
            ) : (
              <span ref={progressRef} className="text-xs font-semibold">
                %
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SingleContentClient;