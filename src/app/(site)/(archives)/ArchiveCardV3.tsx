import { SafeImage } from '@/components/SafeImage';
import { getPostLink } from '@/lib/getPostLink';
import type { PostWithRelations } from '@/types/types';
import { FolderOpen } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';
import {
  HiArrowLeft,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClock,
  HiOutlineEye,
} from 'react-icons/hi2';

/**
 * کارت مقاله — نسخه v3 (2026)
 * - glassmorphism ملایم
 * - conic gradient hover ring
 * - تایپوگرافی بالانس
 * - server component
 */

export interface ArchiveCardV3Props {
  post: PostWithRelations;
  ratio?: 'aspect-[4/3]' | 'aspect-[3/4]' | 'aspect-[16/9]' | 'aspect-square';
  priority?: boolean;
  variant?: 'card' | 'list';
}

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

function formatCompactFa(n: number) {
  if (n >= 1000) {
    return `${(n / 1000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}K`;
  }
  return n.toLocaleString('fa-IR');
}

const ArchiveCardV3: React.FC<ArchiveCardV3Props> = ({
  post,
  ratio = 'aspect-[4/3]',
  priority = false,
  variant = 'card',
}) => {
  if (!post || !post.slug) return null;

  const {
    title,
    categories,
    tags,
    createdAt,
    slug,
    postType,
    excerpt,
    featuredImage,
    author,
    viewCount,
    _count,
  } = post;
  const postLink = getPostLink(postType, slug);
  const primaryCategory = categories?.[0];
  const commentCount = _count?.comments ?? 0;
  const views = viewCount ?? 0;

  if (variant === 'list') {
    return (
      <article className="arc-list-row-v3 group" data-arc-reveal>
        <Link
          href={postLink}
          className="block arc-list-row-v3__media relative focus:outline-none"
          aria-label={title}
        >
          <SafeImage
            src={featuredImage}
            alt={title || ''}
            ratio="4/3"
            containerClassName="absolute inset-0"
            sizes="(min-width: 640px) 180px, 100px"
            className="object-cover"
          />
          {primaryCategory ? (
            <span
              className="absolute z-[2] inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold"
              style={{
                insetBlockStart: '0.5rem',
                insetInlineStart: '0.5rem',
                color: 'oklch(98% 0.005 240)',
                background: 'oklch(20% 0.01 240 / 0.78)',
                border: '1px solid oklch(40% 0.02 240 / 0.6)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <FolderOpen className="w-3 h-3" aria-hidden />
              <span className="truncate max-w-[6rem]">{primaryCategory.name}</span>
            </span>
          ) : null}
        </Link>

        <div className="flex flex-col gap-2 min-w-0 py-1">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
            <FolderOpen className="w-3 h-3" aria-hidden />
            <span className="truncate">
              {tags
                ?.slice(0, 3)
                .map((t) => `#${t.name}`)
                .join('  ') || 'بدون برچسب'}
            </span>
          </div>

          <Link
            href={postLink}
            className="focus:outline-none focus-visible:underline underline-offset-4"
          >
            <h3 className="text-[0.95rem] sm:text-base font-bold leading-snug text-neutral-900 dark:text-white line-clamp-2 tracking-tight">
              {title}
            </h3>
          </Link>

          {excerpt ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed">
              {excerpt}
            </p>
          ) : null}

          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
            {author ? (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: 'oklch(70% 0.13 200)' }}
                  aria-hidden
                />
                <span className="truncate font-medium text-neutral-700 dark:text-neutral-300 max-w-[10rem]">
                  {author.name}
                </span>
              </span>
            ) : null}
            {author ? (
              <span aria-hidden className="opacity-40">
                ·
              </span>
            ) : null}
            <time
              dateTime={new Date(createdAt).toISOString()}
              className="inline-flex items-center gap-1"
            >
              <HiOutlineClock className="w-3 h-3" aria-hidden />
              {formatJalaliDate(createdAt)}
            </time>
            {commentCount > 0 ? (
              <span
                className="inline-flex items-center gap-1"
                aria-label={`${commentCount} دیدگاه`}
              >
                <HiOutlineChatBubbleLeftRight className="w-3 h-3" aria-hidden />
                {commentCount}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1" aria-label={`${views} بازدید`}>
              <HiOutlineEye className="w-3 h-3" aria-hidden />
              <span>{formatCompactFa(views)}</span>
            </span>

            <Link
              href={postLink}
              className="ms-auto inline-flex items-center gap-1 text-[oklch(50%_0.08_235)] hover:gap-1.5 transition-all"
              aria-label={`ادامه ${title}`}
            >
              <span>ادامه</span>
              <HiArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  // variant: 'card' (default)
  return (
    <article className="arc-card-v3 group h-full" data-arc-reveal data-post-slug={slug}>
      <Link
        href={postLink}
        className="block arc-card-v3__media relative focus:outline-none"
        aria-label={title}
      >
        <SafeImage
          src={featuredImage}
          alt={title || ''}
          ratio={ratio.replace('aspect-', '').replace('[', '').replace(']', '')}
          containerClassName="absolute inset-0"
          sizes="(min-width: 1280px) 360px, (min-width: 768px) 33vw, 100vw"
          priority={priority}
          className="object-cover"
        />
        <div className="arc-card-v3__media-overlay" />

        {primaryCategory ? (
          <span
            className="absolute z-[3] inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{
              insetBlockStart: '0.75rem',
              insetInlineStart: '0.75rem',
              color: 'oklch(98% 0.005 240)',
              background: 'oklch(20% 0.01 240 / 0.78)',
              border: '1px solid oklch(40% 0.02 240 / 0.6)',
              backdropFilter: 'blur(8px) saturate(1.4)',
            }}
          >
            <FolderOpen className="w-3 h-3" aria-hidden />
            {primaryCategory.name}
          </span>
        ) : null}

        {postType && postType !== 'STANDARD' ? (
          <span
            className="absolute z-[3] inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{
              insetBlockStart: '0.75rem',
              insetInlineEnd: '0.75rem',
              insetInlineStart: 'auto',
              color: 'oklch(98% 0.005 240)',
              background: 'oklch(20% 0.01 240 / 0.78)',
              border: '1px solid oklch(40% 0.02 240 / 0.6)',
              backdropFilter: 'blur(8px) saturate(1.4)',
            }}
          >
            {postType === 'VIDEO'
              ? 'ویدیو'
              : postType === 'GALLERY'
                ? 'گالری'
                : postType === 'AUDIO'
                  ? 'صوت'
                  : postType}
          </span>
        ) : null}
      </Link>

      <div className="arc-card-v3__body">
        {tags && tags.length > 0 ? (
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span className="text-neutral-400">#</span>
            <span className="truncate">
              {tags
                .slice(0, 3)
                .map((t) => t.name)
                .join('  ·  ')}
            </span>
          </div>
        ) : null}

        <Link
          href={postLink}
          className="focus:outline-none focus-visible:underline underline-offset-4"
        >
          <h3 className="arc-card-v3__title" title={title}>
            {title}
          </h3>
        </Link>

        {excerpt ? <p className="arc-card-v3__excerpt">{excerpt}</p> : null}

        <div className="arc-card-v3__foot">
          <div className="flex items-center gap-2 min-w-0">
            {author ? (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: 'oklch(70% 0.13 200)' }}
                  aria-hidden
                />
                <span className="truncate font-medium text-neutral-700 dark:text-neutral-300">
                  {author.name}
                </span>
              </span>
            ) : null}
            {author ? (
              <span aria-hidden className="opacity-40 shrink-0">
                ·
              </span>
            ) : null}
            <time
              dateTime={new Date(createdAt).toISOString()}
              className="inline-flex items-center gap-1 shrink-0"
            >
              <HiOutlineClock className="w-3.5 h-3.5" aria-hidden />
              {formatJalaliDate(createdAt)}
            </time>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {commentCount > 0 ? (
              <span
                className="inline-flex items-center gap-1"
                aria-label={`${commentCount} دیدگاه`}
              >
                <HiOutlineChatBubbleLeftRight className="w-3.5 h-3.5" aria-hidden />
                {commentCount}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1" aria-label={`${views} بازدید`}>
              <HiOutlineEye className="w-3.5 h-3.5" aria-hidden />
              <span>{formatCompactFa(views)}</span>
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

export default ArchiveCardV3;
