import type React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { PostWithRelations, TaxonomyType } from '@/types/types';
import { getPostLink } from '@/lib/getPostLink';
import { HiArrowLeft, HiOutlineClock, HiOutlineEye, HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { BsFolder2Open, BsTag } from 'react-icons/bs';

/**
 * کارت ۲۰۲۶ مخصوص آرشیو.
 * - Server component (بدون 'use client') برای SEO و حجم کمتر
 * - Glassmorphism ملایم + hover tactile
 * - RTL-friendly
 * - همه چی با همون PostWithRelations کار می‌کنه؛ هیچ تغییری در data shape نمی‌دیم
 */

export interface ArchiveCard11Props {
  post: PostWithRelations;
  /** اندازه‌ی متغیر برای grid های masonry: 1=کوچک، 2=متوسط، 3=بزرگ */
  weight?: 1 | 2 | 3;
  /** Aspect ratio برای media. اختیاری. */
  ratio?: 'aspect-[4/3]' | 'aspect-[3/4]' | 'aspect-[16/9]' | 'aspect-square';
  /** برای اولین کارت (featured) استفاده می‌شه */
  featured?: boolean;
  priority?: boolean;
}

const ratioMap = {
  1: 'aspect-[4/3]',
  2: 'aspect-[3/4]',
  3: 'aspect-[16/9]',
} as const;

function formatJalaliDate(d: Date | string) {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(d));
  } catch {
    return '';
  }
}

const ArchiveCard11: React.FC<ArchiveCard11Props> = ({
  post,
  weight = 1,
  ratio,
  featured = false,
  priority = false,
}) => {
  if (!post || !post.slug) return null;

  const { title, categories, tags, createdAt, slug, postType, excerpt, featuredImage, author, _count } = post;
  const postLink = getPostLink(postType, slug);
  const mediaRatio = ratio ?? (featured ? 'aspect-[16/9]' : ratioMap[weight as 1 | 2 | 3] ?? 'aspect-[4/3]');
  // category object از post ممکنه شکل کامل TaxonomyType (taxonomy, count) رو نداشته باشه
  // (بسته به include در Prisma). برای استفاده‌های فقط-خواندنی (نام/اسلاگ) کافیه.
  const primaryCategory = categories?.[0] as TaxonomyType | undefined;
  const commentCount = _count?.comments ?? 0;
  const viewKey = `view-${slug}`;

  return (
    <article
      className="arc-card group h-full"
      data-arc-reveal
      data-post-slug={slug}
    >
      {/* media */}
      <Link
        href={postLink}
        className="block arc-card-media relative focus:outline-none"
        aria-label={title}
      >
        {featuredImage ? (
          <Image
            src={
              featuredImage.startsWith('/') || featuredImage.startsWith('http')
                ? featuredImage
                : `/${featuredImage}`
            }
            alt={title || ''}
            fill
            sizes="(min-width: 1280px) 360px, (min-width: 768px) 33vw, 100vw"
            className="object-cover"
            loading={priority ? 'eager' : 'lazy'}
            priority={priority}
            unoptimized={featuredImage.includes('.svg')}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-neutral-400 dark:text-neutral-600 text-xs">
            تصویری موجود نیست
          </div>
        )}
        <div className="arc-card-media-overlay" />

        {primaryCategory && (
          <span className="arc-badge inline-flex items-center gap-1">
            <BsFolder2Open className="w-3 h-3" aria-hidden />
            {primaryCategory.name}
          </span>
        )}
        {postType && postType !== 'STANDARD' && (
          <span className="arc-badge top-auto bottom-3 inset-inline-end-3 inset-inline-start-auto">
            {postType === 'VIDEO' ? 'ویدیو' : postType === 'GALLERY' ? 'گالری' : postType === 'AUDIO' ? 'صوت' : postType}
          </span>
        )}
      </Link>

      {/* body */}
      <div className="arc-card-body">
        {tags && tags.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
            <BsTag className="w-3 h-3" aria-hidden />
            <span className="truncate">
              {tags
                .slice(0, 3)
                .map((t) => `#${t.name}`)
                .join('  ')}
            </span>
          </div>
        )}

        <Link
          href={postLink}
          className="focus:outline-none focus-visible:underline underline-offset-4"
        >
          <h3
            className={[
              'arc-card-title',
              featured ? '!text-[1.35rem] !leading-snug' : '',
            ].join(' ')}
            title={title}
          >
            {title}
          </h3>
        </Link>

        {excerpt && (
          <p className="arc-card-excerpt">{excerpt}</p>
        )}

        <div className="arc-card-foot">
          <div className="flex items-center gap-2.5 min-w-0">
            {author && (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[oklch(70%_0.13_200)]" aria-hidden />
                <span className="truncate font-medium text-neutral-700 dark:text-neutral-300">
                  {author.name}
                </span>
              </span>
            )}
            {author && <span aria-hidden className="opacity-40">·</span>}
            <time
              dateTime={new Date(createdAt).toISOString()}
              className="inline-flex items-center gap-1"
            >
              <HiOutlineClock className="w-3.5 h-3.5" aria-hidden />
              {formatJalaliDate(createdAt)}
            </time>
          </div>

          <div className="flex items-center gap-2.5">
            {commentCount > 0 && (
              <span className="inline-flex items-center gap-1" aria-label={`${commentCount} دیدگاه`}>
                <HiOutlineChatBubbleLeftRight className="w-3.5 h-3.5" aria-hidden />
                {commentCount}
              </span>
            )}
            <span className="inline-flex items-center gap-1" aria-hidden>
              <HiOutlineEye className="w-3.5 h-3.5" />
              <span data-view-count={viewKey}>—</span>
            </span>
          </div>
        </div>

        <Link href={postLink} className="arc-cta" aria-label={`ادامه مطلب ${title}`}>
          <span>ادامه مطلب</span>
          <HiArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </article>
  );
};

export default ArchiveCard11;
