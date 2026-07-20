import Card9 from '@/components/Card9/Card9';
import Card11 from '@/components/Card11/Card11';
import type { ActionResult, PostWithRelations } from '@/types/types';
import type React from 'react';
import { use } from 'react';
import { HiPencilSquare, HiSparkles } from 'react-icons/hi2';

interface SingleRelatedPostsProps {
  post: PostWithRelations;
  relatedPostsPromise: Promise<ActionResult<PostWithRelations[]>>;
  moreFromAuthorPromise: Promise<ActionResult<PostWithRelations[]>>;
}

const SingleRelatedPosts: React.FC<SingleRelatedPostsProps> = ({
  relatedPostsPromise,
  moreFromAuthorPromise,
}) => {
  const relatedPostsResult = use(relatedPostsPromise);
  const moreFromAuthorResult = use(moreFromAuthorPromise);

  const relatedPosts =
    relatedPostsResult.success && relatedPostsResult.data ? relatedPostsResult.data : [];
  const moreFromAuthor =
    moreFromAuthorResult.success && moreFromAuthorResult.data ? moreFromAuthorResult.data : [];

  if (relatedPosts.length === 0 && moreFromAuthor.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neutral-50/50 to-neutral-100/50 dark:via-neutral-900/50 dark:to-neutral-950/50 pointer-events-none" />

      <div className="relative py-12 lg:py-16">
        {/* Related Posts Section */}
        {relatedPosts.length > 0 && (
          <section className="mb-16 lg:mb-20">
            {/* Section Header */}
            <div className="flex items-center gap-4 mb-8 lg:mb-10">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl shadow-lg" style={{background: 'var(--ds-brand-600)', boxShadow: '0 8px 24px -4px oklch(52% 0.14 162 / 0.3)'}}>
                <HiSparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-neutral-900 dark:text-white">
                  مطالب مشابه
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                  مقالات مرتبط که ممکن است علاقه‌مند باشید
                </p>
              </div>
              {/* Decorative Line */}
              <div className="hidden sm:block flex-1 h-px bg-gradient-to-l from-transparent via-neutral-200 dark:via-neutral-700 to-transparent me-4" />
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
              {relatedPosts.map((relatedPost, index) => (
                <div
                  key={relatedPost.id}
                  className="opacity-0 animate-[fadeInUp_0.5s_ease-out_forwards]"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <Card11 post={relatedPost} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* More From Author Section */}
        {moreFromAuthor.length > 0 && (
          <section>
            {/* Section Header */}
            <div className="flex items-center gap-4 mb-8 lg:mb-10">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl shadow-lg" style={{background: 'var(--ds-brand-700)', boxShadow: '0 8px 24px -4px oklch(42% 0.14 162 / 0.3)'}}>
                <HiPencilSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-neutral-900 dark:text-white">
                  دیگر مطالب نویسنده
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                  مقالات بیشتر از همین نویسنده
                </p>
              </div>
              {/* Decorative Line */}
              <div className="hidden sm:block flex-1 h-px bg-gradient-to-l from-transparent via-neutral-200 dark:via-neutral-700 to-transparent me-4" />
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
              {moreFromAuthor.map((authorPost, index) => (
                <div
                  key={authorPost.id}
                  className="opacity-0 animate-[fadeInUp_0.5s_ease-out_forwards]"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <Card9 post={authorPost} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default SingleRelatedPosts;
