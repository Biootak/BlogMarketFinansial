import { getPostBySlug } from '@/actions/getPostBySlug';
import SinglePostLayout from '@/app/(site)/(singles)/SinglePostLayout';
import PostFeaturedMedia from '@/components/PostFeaturedMedia/PostFeaturedMedia';
import { buildPostMetadata } from '@/lib/post-metadata';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export interface PageProps {
  params: Promise<{ slug: string[] }>;
}

const SITE_NAME = 'بازار های مالی';

// 2026-08-02: aligned with the default single page — header no longer awaits
// auth(), and all data comes through safeCache, so this route can be ISR
// instead of rendering on-demand for every visitor.
export const revalidate = 300;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const postSlug = slug?.join('/') || '';
  const result = await getPostBySlug(postSlug);

  return buildPostMetadata({
    post: result.success ? result.data : null,
    path: `single/${postSlug}`,
    siteName: SITE_NAME,
  });
}

export default async function PageSingleVideo({ params }: PageProps) {
  const { slug } = await params;
  const postSlug = slug?.join('/') || '';
  const result = await getPostBySlug(postSlug);

  if (!result.success || !result.data) {
    notFound();
  }

  const post = result.data;

  return (
    <SinglePostLayout
      post={post}
      rootClassName="nc-PageSingle"
      hero={<PostFeaturedMedia post={post} className="w-full h-full" imageRatio="video" priority />}
    />
  );
}
