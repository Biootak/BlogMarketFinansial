import type React from 'react';
import Link from 'next/link';
import type { PostWithRelations, TaxonomyType } from '@/types/types';
import { getPostLink } from '@/lib/getPostLink';
import { SafeImage } from '@/components/SafeImage';
import {
  HiArrowLeft,
  HiOutlineClock,
  HiOutlineEye,
  HiOutlineChatBubbleLeftRight,
} from 'react-icons/hi2';
import { BsFolder2Open } from 'react-icons/bs';

/**
 * ردیف فشرده (list view) — افقی، فقط برای حالت density=list.
 * Server component، بدون 'use client'.
 */
export interface ArchiveListRowProps {
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

const ArchiveListRow: React.FC<ArchiveListRowProps> = ({ post }) => {
  if (!post || !post.slug) return null;

  const { title, categories, createdAt, slug, postType, excerpt, featuredImage, author, _count } = post;
  const postLink = getPostLink(postType, slug);
  const primaryCategory = categories?.[0] as TaxonomyType | undefined;
  const commentCount = _count?.comments ?? 0;

  return (
    <article className="arc-list-row group" data-arc-reveal>
      <Link
        href={postLink}
        className="arc-list-row__media block relative focus:outline-none"
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
        {primaryCategory && (
          <span
            className="absolute z-[2] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
            style={{
              insetBlockStart: '0.4rem',
              insetInlineStart: '0.4rem',
              color: 'oklch(98% 0.005 240)',
              background: 'oklch(20% 0.01 240 / 0.78)',
              border: '1px solid oklch(40% 0.02 240 / 0.6)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <BsFolder2Open className="w-2.5 h-2.5" aria-hidden />
            <span className="truncate max-w-[5rem]">{primaryCategory.name}</span>
          </span>
        )}
      </Link>

      <div className="arc-list-row__body">
        <Link
          href={postLink}
          className="focus:outline-none focus-visible:underline underline-offset-4"
        >
          <h3 className="arc-list-row__title" title={title}>
            {title}
          </h3>
        </Link>

        {excerpt && <p className="arc-list-row__excerpt">{excerpt}</p>}

        <div className="arc-list-row__foot">
          {author && <span className="truncate font-medium max-w-[8rem]">{author.name}</span>}
          {author && <span aria-hidden className="opacity-40">·</span>}
          <time
            dateTime={new Date(createdAt).toISOString()}
            className="inline-flex items-center gap-1"
          >
            <HiOutlineClock className="w-3 h-3" aria-hidden />
            {formatJalaliDate(createdAt)}
          </time>
          {commentCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <HiOutlineChatBubbleLeftRight className="w-3 h-3" aria-hidden />
              {commentCount}
            </span>
          )}
          <span className="inline-flex items-center gap-1" aria-hidden>
            <HiOutlineEye className="w-3 h-3" />
            <span>—</span>
          </span>
          <span className="ms-auto inline-flex items-center gap-1 text-[oklch(50%_0.08_235)] group-hover:gap-1.5 transition-all">
            <span>ادامه</span>
            <HiArrowLeft className="w-3 h-3" />
          </span>
        </div>
      </div>
    </article>
  );
};

export default ArchiveListRow;
