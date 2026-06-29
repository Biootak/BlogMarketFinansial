'use client';

// 2026-06-29: Client Component because Jalali date formatting calls
// `new Date()`. Next.js 16's static generation rejects `new Date()` in
// Server Components before dynamic data access. See
// https://nextjs.org/docs/messages/next-prerender-current-time
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
  HiSparkles,
} from 'react-icons/hi2';

export interface ArchiveFeaturedProps {
  post: PostWithRelations;
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

const ArchiveFeatured: React.FC<ArchiveFeaturedProps> = ({ post }) => {
  if (!post || !post.slug) return null;

  const {
    title,
    categories,
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

  return (
    <Card variant="featured" reveal className="arc-fcard-v4">
      <Link
        href={postLink}
        className="arc-fcard-v4__media block relative focus:outline-none"
        aria-label={title}
      >
        <SafeImage
          src={featuredImage}
          alt={title || ''}
          ratio="16/10"
          containerClassName="absolute inset-0"
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
          className="object-cover"
        />
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, transparent 60%, oklch(0% 0 0 / 0.4) 100%)',
          }}
        />

        <span
          className="ds-badge"
          style={{ insetBlockStart: 'var(--ds-space-4)', insetInlineStart: 'var(--ds-space-4)' }}
        >
          <HiSparkles className="w-3.5 h-3.5" aria-hidden />
          انتخاب سردبیر
        </span>

        {primaryCategory ? (
          <span
            className="ds-badge ds-badge--type"
            style={{ insetBlockStart: 'var(--ds-space-4)' }}
          >
            <FolderOpen className="w-3.5 h-3.5" aria-hidden />
            {primaryCategory.name}
          </span>
        ) : null}
      </Link>

      <div className="arc-fcard-v4__body">
        {postType && postType !== 'STANDARD' ? (
          <span
            className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{
              color: 'oklch(98% 0.005 240)',
              background: 'oklch(20% 0.01 240 / 0.78)',
              border: '1px solid oklch(40% 0.02 240 / 0.6)',
              backdropFilter: 'blur(8px)',
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

        <Link href={postLink} className="focus:outline-none focus-visible:underline underline-offset-4">
          <h2 className="arc-fcard-v4__title" title={title}>
            {title}
          </h2>
        </Link>

        {excerpt ? <p className="arc-fcard-v4__excerpt">{excerpt}</p> : null}

        <div className="arc-fcard-v4__foot">
          <div className="ds-card__foot-meta">
            {author ? (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--ds-brand-500)' }}
                  aria-hidden
                />
                <span className="truncate font-medium max-w-[10rem]">{author.name}</span>
              </span>
            ) : null}
            {author ? <span aria-hidden className="opacity-40">·</span> : null}
            <time
              dateTime={new Date(createdAt).toISOString()}
              className="inline-flex items-center gap-1"
            >
              <HiOutlineClock className="w-3.5 h-3.5" aria-hidden />
              {formatJalaliDate(createdAt)}
            </time>
          </div>
          <div className="ds-card__foot-actions">
            {commentCount > 0 ? (
              <span className="inline-flex items-center gap-1">
                <HiOutlineChatBubbleLeftRight className="w-3.5 h-3.5" aria-hidden />
                {commentCount.toLocaleString('fa-IR')} دیدگاه
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1" aria-label={`${views} بازدید`}>
              <HiOutlineEye className="w-3.5 h-3.5" aria-hidden />
              <span>{formatCompactFa(views)} بازدید</span>
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

export default ArchiveFeatured;
