import type React from 'react';
import { use } from 'react';
import Heading from '@/components/Heading/Heading';
import Card11 from '@/components/Card11/Card11';
import Card9 from '@/components/Card9/Card9';
import type { PostWithRelations, ActionResult } from '@/types/types';

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

  const headingClasses = 'mb-6 text-base text-primary-700';

  return (
    <div className="relative py-4 mt-6">
      <div className="container">
        {relatedPosts.length > 0 && (
          <div>
            <Heading className={headingClasses} desc="">
              مطالب مشابه
            </Heading>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {relatedPosts.map((relatedPost) => (
                <Card11 key={relatedPost.id} post={relatedPost} />
              ))}
            </div>
          </div>
        )}

        {moreFromAuthor.length > 0 && (
          <div className="mt-8">
            <Heading className={headingClasses} desc="">
              دیگر مطالب نویسنده
            </Heading>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {moreFromAuthor.map((authorPost) => (
                <Card9 key={authorPost.id} post={authorPost} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SingleRelatedPosts;
