import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/actions/postActions';
import { getRelatedPosts } from '@/actions/getRelatedPosts';
import { getMoreFromAuthor } from '@/actions/getMoreFromAuthor';
import SingleHeader from '@/app/(site)/(singles)/SingleHeader';
import SingleContent from '@/app/(site)/(singles)/SingleContent';
import SingleRelatedPosts from '@/app/(site)/(singles)/SingleRelatedPosts';
import NcImage from '@/components/NcImage/NcImage';
import Loading from '@/components/Loading';

// اضافه کردن import برای پارسر HTML
import parse from 'html-react-parser';

export interface PageProps {
  params: { slug: string[] };
}

export default async function PageSingle({ params }: PageProps) {
  const postSlug = params.slug?.join('/') || '';
  const result = await getPostBySlug(postSlug);

  if (!result.success || !result.data) {
    notFound();
  }

  const post = result.data;

  const relatedPostsPromise = getRelatedPosts(
    post.id,
    post.categories.map((cat) => cat.id),
  );
  const moreFromAuthorPromise = getMoreFromAuthor(post.authorId, post.id);

  // تعریف تابع parseOptions برای مدیریت رنگ و هایلایت
  const parseOptions = {
    replace: (domNode: any) => {
      if (domNode.attribs && domNode.name === 'span') {
        const style = domNode.attribs.style || '';
        const className = domNode.attribs.class || '';

        if (style.includes('color:') || className.includes('highlight-')) {
          return (
            <span style={{ ...domNode.attribs.style }} className={className}>
              {domNode.children[0].data}
            </span>
          );
        }
      }
    },
  };

  return (
    <div className="nc-PageSingle pt-8 lg:pt-16 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <header className="rounded-xl bg-gray-50 dark:bg-gray-800 shadow-sm p-6 mb-8">
          <div className="max-w-screen-md mx-auto">
            <SingleHeader post={post} />
          </div>
        </header>

        <div className="relative aspect-video max-w-5xl mx-auto mb-12 rounded-xl overflow-hidden">
          <NcImage
            alt={post.title}
            containerClassName="container my-10 sm:my-12"
            className="w-full rounded-xl"
            src={
              post.featuredImage ||
              'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg'
            }
            width={1260}
            height={750}
            sizes="(max-width: 1024px) 100vw, 1280px"
            fill={false}
          />
        </div>

        <div className="container mt-10">
          {/* استفاده از پارسر HTML برای محتوای پست */}
          <div className="nc-SingleContent prose prose-sm sm:prose lg:prose-lg mx-auto dark:prose-invert">
            {parse(post.content, parseOptions)}
          </div>
          <Suspense fallback={<Loading />}>
            <SingleRelatedPosts
              post={post}
              relatedPostsPromise={relatedPostsPromise}
              moreFromAuthorPromise={moreFromAuthorPromise}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
