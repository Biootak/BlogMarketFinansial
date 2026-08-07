import { getActiveAdvertisements } from '@/actions/advertisementActions';
import { getMoreFromAuthor } from '@/actions/getMoreFromAuthor';
import { getRelatedPosts } from '@/actions/getRelatedPosts';
import { getSidebarData } from '@/actions/sidebarActions';
import type { ActionResult, PostWithRelations } from '@/types/types';
import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import SingleContent from './SingleContent';
import SingleHeader from './SingleHeader';
import SingleRelatedPosts from './SingleRelatedPosts';

interface SinglePostLayoutProps {
  post: PostWithRelations;
  /** کلاس ریشه‌ی صفحه — برای هدف‌گیری per-template. */
  rootClassName: string;
  /** فاصله‌ی ستون مقاله و ستون کنار — قالب گالری بازتر است. */
  columnGapClassName?: string;
  /** مدیای قهرمان بالای هدر؛ اگر نباشد هدر بدون overlap رندر می‌شود. */
  hero?: ReactNode;
  /** بلوک اختیاری بین هدر و متن (مثلاً گرید گالری). */
  afterHeader?: ReactNode;
}

/**
 * چیدمان مشترک صفحه‌های تک‌پست (audio / video / gallery / template-3):
 * مدیای قهرمان → هدر → متن → sidebar → پست‌های مرتبط.
 * داده‌های پیرامونی (sidebar، تبلیغات، پست‌های مرتبط) اینجا و به‌صورت موازی
 * گرفته می‌شوند تا هر route فقط پست خودش را load کند.
 */
export default async function SinglePostLayout({
  post,
  rootClassName,
  columnGapClassName = 'gap-6 lg:gap-8',
  hero,
  afterHeader,
}: SinglePostLayoutProps) {
  const relatedPostsPromise: Promise<ActionResult<PostWithRelations[]>> = getRelatedPosts(
    post.id,
    post.categories.map((cat) => cat.id),
  );
  const moreFromAuthorPromise: Promise<ActionResult<PostWithRelations[]>> = getMoreFromAuthor(
    post.authorId,
    post.id,
  );

  const [sidebarData, sidebarAdsResult, inContentAdsResult] = await Promise.all([
    getSidebarData(),
    getActiveAdvertisements({
      limit: 3,
      size: 'MEDIUM',
      position: 'SIDEBAR',
      orderBy: 'createdAt',
      orderDirection: 'desc',
    }),
    getActiveAdvertisements({
      limit: 1,
      position: 'IN_CONTENT',
      orderBy: 'createdAt',
      orderDirection: 'desc',
    }),
  ]);
  const inContentAd =
    inContentAdsResult.success && inContentAdsResult.data?.[0] ? inContentAdsResult.data[0] : null;

  const headerClassName = hero
    ? 'relative -mt-16 sm:-mt-20 @lg/single-layout:-mt-24 @xl/single-layout:-mt-32 z-20 mx-3 sm:mx-4 @lg/single-layout:mx-6 @xl/single-layout:mx-8'
    : 'relative z-20';

  return (
    <div className={`${rootClassName} relative min-h-dvh`}>
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-50 via-white to-neutral-50/50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950/50 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.15),transparent)] pointer-events-none" />

      <div className="relative container pt-6 pb-12 lg:pt-8 lg:pb-16 @container/single-layout">
        <div className={`flex flex-col lg:flex-row ${columnGapClassName}`}>
          {/* Main Content Area */}
          <article className="w-full @lg/single-layout:basis-[68%] @xl/single-layout:basis-[70%] grow-0 shrink">
            {hero ? (
              <div className="relative aspect-[16/9] md:aspect-[16/9] @lg/single-layout:aspect-[21/9] rounded-2xl @lg/single-layout:rounded-3xl overflow-hidden mb-8 group">
                {hero}
              </div>
            ) : null}

            {/* Header Section */}
            <div className={headerClassName}>
              <SingleHeader post={post} />
            </div>

            {afterHeader ? <div className="mt-8">{afterHeader}</div> : null}

            {/* Content */}
            <div className="mt-8 lg:mt-10">
              <SingleContent post={post} inContentAd={inContentAd} />
            </div>
          </article>

          {/* Sidebar */}
          <aside className="w-full @lg/single-layout:basis-[32%] @xl/single-layout:basis-[30%] grow-0 shrink">
            <div className="sticky top-24 space-y-8">
              <div className="relative">
                {/* Decorative Glow */}
                <div className="absolute -inset-1 bg-gradient-to-br from-primary-500/20 via-violet-500/10 to-rose-500/20 rounded-3xl blur-xl opacity-0 hover:opacity-100 transition-opacity duration-500" />

                <Sidebar
                  ads={
                    sidebarAdsResult.success && sidebarAdsResult.data ? sidebarAdsResult.data : []
                  }
                  className="relative space-y-6 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-2xl p-5 border border-neutral-200/50 dark:border-neutral-800/50 shadow-[0_8px_40px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.2)]"
                  widgetPosts={sidebarData?.recentPosts ?? []}
                  tags={sidebarData?.popularTags ?? []}
                  categories={sidebarData?.popularCategories ?? []}
                  authors={sidebarData?.popularAuthors ?? []}
                />
              </div>
            </div>
          </aside>
        </div>

        {/* Related Posts Section */}
        <div className="mt-16 lg:mt-24">
          <SingleRelatedPosts
            post={post}
            relatedPostsPromise={relatedPostsPromise}
            moreFromAuthorPromise={moreFromAuthorPromise}
          />
        </div>
      </div>
    </div>
  );
}
