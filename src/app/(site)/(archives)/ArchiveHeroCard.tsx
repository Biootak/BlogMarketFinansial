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
  HiSparkles,
} from 'react-icons/hi2';
import { BsFolder2Open } from 'react-icons/bs';

/**
 * کارت ویژه (hero) برای اولین مقاله‌ی آرشیو.
 * - ۲ برابر بزرگ‌تر از کارت‌های معمولی (در دسکتاپ)
 * - layout دو ستونه: media + body
 * - eyebrow chip "انتخاب سردبیر"
 * - همه چی server component — هیچ تغییری در data shape نمی‌دیم
 */
export interface ArchiveHeroCardProps {
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

const ArchiveHeroCard: React.FC<ArchiveHeroCardProps> = ({ post }) => {
  if (!post || !post.slug) return null;

  const { title, categories, createdAt, slug, postType, excerpt, featuredImage, author, _count } = post;
  const postLink = getPostLink(postType, slug);
  const primaryCategory = categories?.[0] as TaxonomyType | undefined;
  const commentCount = _count?.comments ?? 0;

  return (
    <article className="arc-fcard-hero group" data-arc-reveal>
      {/* media */}
      <Link
        href={postLink}
        className="block arc-fcard-hero-media relative focus:outline-none"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent z-[2] pointer-events-none" />

        <span className="arc-fcard-hero-eyebrow" style={{ insetInlineStart: '1rem', insetBlockStart: '1rem' }}>
          <HiSparkles className="w-3.5 h-3.5" aria-hidden />
          انتخاب سردبیر
        </span>

        {primaryCategory && (
          <span
            className="arc-fcard-hero-eyebrow"
            style={{ insetInlineStart: 'auto', insetInlineEnd: '1rem', insetBlockStart: '1rem' }}
          >
            <BsFolder2Open className="w-3.5 h-3.5" aria-hidden />
            {primaryCategory.name}
          </span>
        )}
      </Link>

      {/* body */}
      <div className="arc-fcard-hero-body">
        {postType && postType !== 'STANDARD' && (
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
        )}

        <Link
          href={postLink}
          className="focus:outline-none focus-visible:underline underline-offset-4"
        >
          <h2 className="arc-fcard-hero-title" title={title}>
            {title}
          </h2>
        </Link>

        {excerpt && <p className="arc-fcard-hero-excerpt">{excerpt}</p>}

        <div className="arc-fcard-hero-foot">
          {author && (
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: 'oklch(70% 0.13 200)' }}
                aria-hidden
              />
              <span className="truncate font-medium">{author.name}</span>
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
          {commentCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <HiOutlineChatBubbleLeftRight className="w-3.5 h-3.5" aria-hidden />
              {commentCount} دیدگاه
            </span>
          )}
          <span className="inline-flex items-center gap-1" aria-hidden>
            <HiOutlineEye className="w-3.5 h-3.5" />
            <span>—</span>
          </span>
        </div>

        <Link
          href={postLink}
          className="arc-cta"
          aria-label={`ادامه مطلب ${title}`}
        >
          <span>ادامه مطلب</span>
          <HiArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </article>
  );
};

export default ArchiveHeroCard;
