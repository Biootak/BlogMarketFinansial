import EditorContentHTML from '@/components/Editor1/EditorContentHTML';
import type { Advertisement, PostWithRelations } from '@/types/types';
import SingleContentClient from './SingleContentClient';

interface SingleContentProps {
  post: PostWithRelations;
  inContentAd?: Advertisement | null;
}

/**
 * SingleContent — server data boundary for the article page.
 *
 * 2026-08-02: `getCurrentUser()` (which awaited auth()) was removed. Like
 * state is now resolved client-side via useSession in the like button; this
 * frees single pages from request-time auth so they can be ISR/static.
 */
const SingleContent = async ({ post, inContentAd }: SingleContentProps) => {
  const commentCount = post._count?.comments ?? 0;

  // The article body is rendered to static HTML on the server (generateHTML /
  // react-markdown) and passed through the RSC children slot — the TipTap
  // editor runtime and markdown pipeline never ship to the client.
  const body = post.content ? (
    <EditorContentHTML content={post.content} inContentAd={inContentAd} />
  ) : null;

  return (
    <SingleContentClient post={post} commentCount={commentCount}>
      {body}
    </SingleContentClient>
  );
};

export default SingleContent;
