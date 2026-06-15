import type { PostWithRelations, Advertisement } from '@/types/types';
import SingleContentClient from './SingleContentClient';
import getCurrentUser from '@/lib/current-user';

interface SingleContentProps {
  post: PostWithRelations;
  inContentAd?: Advertisement | null;
}

const SingleContent = async ({ post, inContentAd }: SingleContentProps) => {
  const user = await getCurrentUser();
  const currentUserId = user?.id;

  const isLiked = currentUserId
    ? (post.likes?.some((like) => like.userId === currentUserId) ?? false)
    : false;

  const likeCount = post._count?.likes ?? 0;
  const commentCount = post._count?.comments ?? 0;

  return (
    <SingleContentClient
      post={post}
      initialLiked={isLiked}
      initialLikeCount={likeCount}
      commentCount={commentCount}
      inContentAd={inContentAd}
    />
  );
};

export default SingleContent;
