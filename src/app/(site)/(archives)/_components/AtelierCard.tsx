'use client';

import { SafeImage } from '@/components/SafeImage';
import { getPostLink } from '@/lib/getPostLink';
import type { PostWithRelations } from '@/types/types';
import { Eye, MessagesSquare } from 'lucide-react';
// 2026-06-29: Marked as a Client Component because date formatting uses
// `new Date()`. In Next.js 16 static generation, calling `new Date()` inside
// a Server Component before any uncached/request data triggers the
// `next-prerender-current-time` invariant. Moving the card to the client
// keeps the route statically prerenderable while the date is formatted in
// the browser / SSR simulation.
import Link from 'next/link';
import React from 'react';

/**
 * AtelierCard — editorial article card (2026).
 * Clean image, category kicker, clamped title + excerpt, and a foot row with
 * author and engagement stats. Data handling matches the rest of the app.
 */
export interface AtelierCardProps {
  post: PostWithRelations;
  priority?: boolean;
}

function formatCompactFa(n: number) {
  if (n >= 1000) return `${(n / 1000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}K`;
  return n.toLocaleString('fa-IR');
}

// Module-level singleton — shared across all AtelierCard instances
const _faDateFmt = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function formatJalaliDate(d: Date | string) {
  try {
    return _faDateFmt.format(new Date(d));
  } catch {
    return '';
  }
}

function typeLabel(postType?: string | null) {
  switch (postType) {
    case 'VIDEO':
      return 'ویدیو';
    case 'GALLERY':
      return 'گالری';
    case 'AUDIO':
      return 'صوت';
    default:
      return null;
  }
}

const AtelierCard: React.FC<AtelierCardProps> = React.memo(
  function AtelierCard({ post, priority = false }) {
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
    const tLabel = typeLabel(postType);

    return (
      <article className="atl-card">
        <Link
          href={postLink}
          className="atl-card__media block focus:outline-none"
          aria-label={title}
        >
          <SafeImage
            src={featuredImage}
            alt={title || ''}
            ratio="16/10"
            containerClassName="absolute inset-0"
            sizes="(min-width: 1280px) 320px, (min-width: 768px) 33vw, 100vw"
            priority={priority}
            className="object-cover"
          />
          {tLabel ? <span className="atl-card__badge">{tLabel}</span> : null}
        </Link>
        <div className="atl-card__body">
          {primaryCategory ? (
            <span className="atl-card__kicker">{primaryCategory.name}</span>
          ) : null}
          <Link
            href={postLink}
            className="focus:outline-none focus-visible:underline underline-offset-4"
          >
            <h3 className="atl-card__title" title={title}>
              {title}
            </h3>
          </Link>
          {excerpt ? <p className="atl-card__excerpt">{excerpt}</p> : null}
          <div className="atl-card__foot">
            <span className="atl-card__author">
              {author ? (
                <>
                  <span className="atl-dot2" aria-hidden />
                  <span className="truncate">{author.name}</span>
                </>
              ) : (
                <span>{formatJalaliDate(createdAt)}</span>
              )}
            </span>
            <span className="atl-card__stats">
              {commentCount > 0 ? (
                <span aria-label={`${commentCount} دیدگاه`}>
                  <MessagesSquare className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
                  {commentCount.toLocaleString('fa-IR')}
                </span>
              ) : null}
              <span aria-label={`${views} بازدید`}>
                <Eye className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
                {formatCompactFa(views)}
              </span>
            </span>
          </div>
        </div>
      </article>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: فقط اگر post ID یا priority تغییر کرد re-render کن
    return prevProps.post.id === nextProps.post.id && prevProps.priority === nextProps.priority;
  },
);

AtelierCard.displayName = 'AtelierCard';

export default AtelierCard;
