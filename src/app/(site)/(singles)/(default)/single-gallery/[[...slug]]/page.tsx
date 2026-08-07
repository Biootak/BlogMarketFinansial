import { getGalleryPostBySlug } from '@/actions/getGalleryPostBySlug';
import SinglePostLayout from '@/app/(site)/(singles)/SinglePostLayout';
import { buildPostMetadata } from '@/lib/post-metadata';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GalleryImages from '../GalleryImages';

export interface PageProps {
  params: Promise<{ slug: string[] }>;
}

const SITE_NAME = 'بیوتاک';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const postSlug = slug?.join('/') || '';
  const result = await getGalleryPostBySlug(postSlug);

  return buildPostMetadata({
    post: result.success ? result.data : null,
    path: `single-gallery/${postSlug}`,
    siteName: SITE_NAME,
  });
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const postSlug = slug?.join('/') || '';
  const result = await getGalleryPostBySlug(postSlug);

  if (!result.success || !result.data) {
    notFound();
  }

  const post = result.data;

  return (
    <SinglePostLayout
      post={post}
      rootClassName="nc-PageSingle-Gallery"
      columnGapClassName="gap-8 lg:gap-12"
      afterHeader={<GalleryImages post={post} />}
    />
  );
}
