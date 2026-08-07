/**
 * post-metadata — سازنده‌ی `Metadata` مشترک صفحه‌های تک‌پست (OpenGraph + Twitter).
 */
import type { PostWithRelations } from '@/types/types';
import type { Metadata } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://financialmarket.page';

const DESCRIPTION_LENGTH = 160;

interface BuildPostMetadataOptions {
  /** پست؛ اگر پیدا نشده باشد متادیتای «یافت نشد» برمی‌گردد. */
  post: PostWithRelations | null | undefined;
  /** مسیر صفحه بدون اسلش ابتدایی — مثلاً `single/my-slug`. */
  path: string;
  siteName: string;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function buildPostMetadata({ post, path, siteName }: BuildPostMetadataOptions): Metadata {
  if (!post) {
    return { title: 'پست یافت نشد' };
  }

  const postUrl = `${APP_URL}/${path}`;
  const imageUrl = post.featuredImage || `${APP_URL}/images/default-og.jpg`;

  // توضیحات از excerpt، وگرنه از متن بدون تگ HTML.
  const description =
    post.excerpt ||
    (post.content
      ? `${post.content.replace(/<[^>]*>/g, '').slice(0, DESCRIPTION_LENGTH)}...`
      : `${siteName} - مرجع تحلیل بازارهای مالی`);

  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      url: postUrl,
      siteName,
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
      publishedTime: toIso(post.createdAt),
      modifiedTime: toIso(post.updatedAt),
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
