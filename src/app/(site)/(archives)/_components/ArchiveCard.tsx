import { Card } from '@/components/ds';
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
 * کارت مقاله — نسخه‌ی بازسازی‌شده با DS
 * - منطق داده‌ها دست‌نخورده
 * - presentation فقط از tokens استفاده می‌کند
 */
export interface ArchiveCardProps {
  post: PostWithRelations;
  ratio?: '4/3' | '3/4' | '16/9' | '1/1';
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

const ArchiveCard: React.FC<ArchiveCardProps> = ({
  post,
  ratio = '4/3',
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
      <Card variant="list" className="ds-list-row">
        <Link
          href={postLink}
          className="ds-card__media block relative focus:outline-none"
          style={{ aspectRatio: '4/3' }}
          aria-label={title}
        >
          <SafeImage
            src={featuredImage}
            alt={title || ''}
            ratio="4/3"
            variant="thumbnail"
            containerClassName="absolute inset-0"
            sizes="(min-width: 640px) 180px, 100px"
            className="object-cover"
          />
          {primaryCategory ? (
            <span className="ds-badge">
              <FolderOpen className="w-3 h-3" aria-hidden />
              <span className="truncate max-w-[6rem]">{primaryCategory.name}</span>
            </span>
          ) : null}
        </Link>

        <div className="ds-card__body">
          <div className="ds-card__foot-meta">
            <FolderOpen className="w-3 h-3" aria-hidden />
            <span className="truncate">
              {tags
                ?.slice(0, 3)
                .map((t) => `#${t.name}`)
                .join('  ') || 'بدون برچسب'}
            </span>
          </div>

          <Link href={postLink} className="focus:outline-none focus-visible:underline underline-offset-4">
            <h3 className="ds-card__title">{title}</h3>
          </Link>

          {excerpt ? <p className="ds-card__excerpt">{excerpt}</p> : null}

          <div className="ds-card__foot">
            <div className="ds-card__foot-meta">
              {author ? (
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--ds-brand-500)' }}
                    aria-hidden
                  />
                  <span className="truncate font-medium text-[var(--ds-text-primary)] max-w-[10rem]">
                    {author.name}
                  </span>
                </span>
              ) : null}
              {author ? <span aria-hidden className="opacity-40">·</span> : null}
              <time
                dateTime={new Date(createdAt).toISOString()}
                className="inline-flex items-center gap-1"
              >
                <HiOutlineClock className="w-3 h-3" aria-hidden />
                {formatJalaliDate(createdAt)}
              </time>
            </div>
            <div className="ds-card__foot-actions">
              {commentCount > 0 ? (
                <span className="inline-flex items-center gap-1" aria-label={`${commentCount} دیدگاه`}>
                  <HiOutlineChatBubbleLeftRight className="w-3 h-3" aria-hidden />
                  {commentCount}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1" aria-label={`${views} بازدید`}>
                <HiOutlineEye className="w-3 h-3" aria-hidden />
                <span>{formatCompactFa(views)}</span>
              </span>
            </div>
          </div>

          <Link href={postLink} className="ds-cta" aria-label={`ادامه ${title}`}>
            <span>ادامه</span>
            <HiArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Card>
    );
  }

  // variant: 'card' (default)
  return (
    <Card reveal>
      <Link
        href={postLink}
        className="ds-card__media block relative focus:outline-none"
        aria-label={title}
      >        <SafeImage
          src={featuredImage}
          alt={title || ''}
          ratio={ratio}
          containerClassName="absolute inset-0"
          sizes="(min-width: 1280px) 360px, (min-width: 768px) 33vw, 100vw"
          priority={priority}
          className="object-cover"
        />
        <div className="ds-card__media-overlay" />

        {primaryCategory ? (
          <span className="ds-badge">
            <FolderOpen className="w-3 h-3" aria-hidden />
            {primaryCategory.name}
          </span>
        ) : null}

        {postType && postType !== 'STANDARD' ? (
          <span className="ds-badge ds-badge--type">
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

      <div className="ds-card__body">
        {tags && tags.length > 0 ? (
          <div className="ds-card__foot-meta">
            <span className="opacity-60">#</span>
            <span className="truncate">
              {tags
                .slice(0, 3)
                .map((t) => t.name)
                .join('  ·  ')}
            </span>
          </div>
        ) : null}

        <Link href={postLink} className="focus:outline-none focus-visible:underline underline-offset-4">
          <h3 className="ds-card__title" title={title}>{title}</h3>
        </Link>

        {excerpt ? <p className="ds-card__excerpt">{excerpt}</p> : null}

        <div className="ds-card__foot">
          <div className="ds-card__foot-meta">
            {author ? (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: 'var(--ds-brand-500)' }}
                  aria-hidden
                />
                <span className="truncate font-medium text-[var(--ds-text-primary)]">
                  {author.name}
                </span>
              </span>
            ) : null}
            {author ? <span aria-hidden className="opacity-40 shrink-0">·</span> : null}
            <time
              dateTime={new Date(createdAt).toISOString()}
              className="inline-flex items-center gap-1 shrink-0"
            >
              <HiOutlineClock className="w-3.5 h-3.5" aria-hidden />
              {formatJalaliDate(createdAt)}
            </time>
          </div>

          <div className="ds-card__foot-actions">
            {commentCount > 0 ? (
              <span className="inline-flex items-center gap-1" aria-label={`${commentCount} دیدگاه`}>
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

        <Link href={postLink} className="ds-cta" aria-label={`ادامه مطلب ${title}`}>
          <span>ادامه مطلب</span>
          <HiArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </Card>
  );
};

export default ArchiveCard;
