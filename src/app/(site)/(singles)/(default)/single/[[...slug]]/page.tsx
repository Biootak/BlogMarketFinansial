import { getActiveAdvertisements } from '@/actions/advertisementActions';
import { getMoreFromAuthor } from '@/actions/getMoreFromAuthor';
import { getRelatedPosts } from '@/actions/getRelatedPosts';
import { getPostBySlug, getPostsForStaticParams } from '@/actions/postActions';
import { getSidebarData } from '@/actions/sidebarActions';
import SingleContent from '@/app/(site)/(singles)/SingleContent';
import SingleHeader from '@/app/(site)/(singles)/SingleHeader';
import SingleRelatedPosts from '@/app/(site)/(singles)/SingleRelatedPosts';
import NcImage from '@/components/NcImage/NcImage';
import type { ActionResult, PostWithRelations } from '@/types/types';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Sidebar from '../../../Sidebar';

// 2026-08-02: ISR for article pages. Header no longer awaits auth(), so single
// pages render statically at build + revalidate every 5 min (and on publish /
// update via revalidatePath('/single/...') + revalidateTag('post-slug')).
export const revalidate = 300;
export const dynamicParams = true;

export interface PageProps {
  params: Promise<{ slug: string[] }>;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://financialmarket.page';

/**
 * Prerender the most recent published slugs so article pages have static HTML
 * at build. Older / newly-added slugs render on demand (dynamicParams=true)
 * and are cached afterwards. The DB list is bounded to keep build time and
 * connection count low (staticGenerationMaxConcurrency=1).
 */
export async function generateStaticParams(): Promise<Array<{ slug: string[] }>> {
  const posts = await getPostsForStaticParams();
  return posts.map((s) => ({ slug: s.split('/') }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const postSlug = slug?.join('/') || '';
  const result = await getPostBySlug(postSlug);

  if (!result.success || !result.data) {
    return {
      title: 'پست یافت نشد',
    };
  }

  const post = result.data;
  const postUrl = `${APP_URL}/single/${postSlug}`;
  const imageUrl = post.featuredImage || `${APP_URL}/images/default-og.jpg`;

  // استخراج توضیحات از محتوا (حذف HTML tags)
  const description =
    post.excerpt ||
    (post.content
      ? `${post.content.replace(/<[^>]*>/g, '').slice(0, 160)}...`
      : 'بیوتاک - مرجع تحلیل بازارهای مالی');

  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      url: postUrl,
      siteName: 'بیوتاک',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      locale: 'fa_IR',
      type: 'article',
      publishedTime: post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
      modifiedTime: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
      authors: post.author?.name ? [post.author.name] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function PageSingle({ params }: PageProps) {
  const { slug } = await params;
  const postSlug = slug?.join('/') || '';
  const result = await getPostBySlug(postSlug);

  if (!result.success || !result.data) {
    notFound();
  }

  const post = result.data;

  // Kick off all non-blocking fetches in parallel to avoid sequential waterfalls.
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

  return (
    <div className="nc-PageSingle relative min-h-dvh">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-50 via-white to-neutral-50/50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950/50 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, oklch(58% 0.12 165 / 0.07), transparent)',
        }}
      />

      <div className="relative container pt-6 pb-12 lg:pt-8 lg:pb-16 @container/single-layout">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Main Content Area */}
          <article className="w-full @lg/single-layout:basis-[68%] @xl/single-layout:basis-[70%] grow-0 shrink">
            {/* Hero Image with Overlay */}
            <div className="relative aspect-[16/9] md:aspect-[16/9] @lg/single-layout:aspect-[21/9] rounded-2xl @lg/single-layout:rounded-3xl overflow-hidden mb-8 group">
              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
              <div
                className="absolute inset-0 z-10 mix-blend-overlay"
                style={{
                  background:
                    'linear-gradient(135deg, oklch(52% 0.14 162 / 0.1), transparent, oklch(58% 0.12 165 / 0.06))',
                }}
              />

              {/* Image — priority=true for LCP preload */}
              <NcImage
                alt={post.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                src={
                  post.featuredImage ||
                  'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg'
                }
                width={1400}
                height={600}
                sizes="(max-width: 1024px) 100vw, 1400px"
                fill={false}
                priority
              />

              {/* Decorative Elements */}
              <div className="absolute top-4 right-4 w-20 h-20 border border-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute bottom-4 left-4 w-12 h-12 border border-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100" />
            </div>

            {/* Header Section */}
            <div className="relative -mt-16 sm:-mt-20 @lg/single-layout:-mt-24 @xl/single-layout:-mt-32 z-20 mx-3 sm:mx-4 @lg/single-layout:mx-6 @xl/single-layout:mx-8">
              <SingleHeader post={post} />
            </div>

            {/* Content */}
            <div className="mt-8 lg:mt-10">
              <SingleContent post={post} inContentAd={inContentAd} />
            </div>
          </article>

          {/* Sidebar */}
          <aside className="w-full @lg/single-layout:basis-[32%] @xl/single-layout:basis-[30%] grow-0 shrink">
            <div className="sticky top-24 space-y-8">
              {/* Sidebar Card Wrapper */}
              <div className="relative">
                {/* Decorative Glow */}
                <div
                  className="absolute -inset-1 rounded-3xl blur-xl opacity-0 hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background:
                      'linear-gradient(135deg, oklch(58% 0.12 165 / 0.2), oklch(58% 0.12 165 / 0.08), oklch(92% 0.05 165 / 0.15))',
                  }}
                />

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
