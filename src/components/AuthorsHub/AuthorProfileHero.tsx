import AuthorAvatar from '@/components/AuthorsHub/primitives/AuthorAvatar';
import styles from '@/components/AuthorsHub/AuthorProfileHero.module.css';
import { cn, toPersianNumber } from '@/lib/utils';
import { Briefcase, Building2 } from 'lucide-react';
import Image from 'next/image';
/**
 * @file AuthorProfileHero
 * @description Signature editorial hero — 2026-07 redesign.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────┐
 *   │  [avatar + spinning ring]       [نویسنده • badge]   │  ← mesh bg
 *   │                                                      │
 *   │  عنوان بزرگ نویسنده                                 │
 *   │  ~~~~~~~~~~~~~~~~~~~~ (SVG animated underline)       │
 *   │  [chip: job] [chip: company]                         │
 *   │  bio text                                            │
 *   ├──────────────────────────────────────────────────────┤
 *   │  مقالات │ کتگوری‌ها │ کامنت‌ها │  لایک‌ها           │  ← frosted bar
 *   └──────────────────────────────────────────────────────┘
 *
 * Server-renderable. No client JS. Dark-always mesh (no dark/light toggle needed —
 * the card is its own dark surface on both modes).
 */
import type * as React from 'react';

export interface AuthorProfileHeroAuthor {
  id: string;
  name: string | null;
  email?: string | null;
  profile?: {
    avatar?: string | null;
    bgImage?: string | null;
    bio?: string | null;
    jobName?: string | null;
    company?: string | null;
  } | null;
  _count?: { posts?: number };
  createdAt?: Date | string;
}

export interface AuthorProfileHeroProps {
  author: AuthorProfileHeroAuthor;
  categoryCount?: number;
  commentCount?: number;
  likeCount?: number;
  className?: string;
}

const isLocalUploads = (raw: string): boolean => raw.startsWith('/uploads/');
const isLocalAsset = (raw: string): boolean => raw.startsWith('/') && !raw.startsWith('//');

const AuthorProfileHero: React.FC<AuthorProfileHeroProps> = ({
  author,
  categoryCount = 0,
  commentCount = 0,
  likeCount = 0,
  className,
}) => {
  const name = author.name?.trim() || 'نویسنده';
  const job = author.profile?.jobName;
  const company = author.profile?.company;
  const bio = author.profile?.bio;
  const avatar = author.profile?.avatar ?? null;
  const bgImage = author.profile?.bgImage?.trim() ?? null;
  const postCount = author._count?.posts ?? 0;

  const useNextImage = bgImage ? isLocalUploads(bgImage) : false;
  const usePlainImg = bgImage ? (!useNextImage && !isLocalAsset(bgImage)) : false;

  const stats = [
    { label: 'مقالات',    value: postCount },
    { label: 'کتگوری‌ها', value: categoryCount },
    { label: 'کامنت‌ها',  value: commentCount },
    { label: 'لایک‌ها',   value: likeCount },
  ] as const;

  return (
    <section
      dir="rtl"
      className={cn(styles.hero, className)}
      aria-label={`پروفایل ${name}`}
    >
      {/* ── Ambient Mesh Background ───────────────────────────── */}
      <div aria-hidden className={styles.meshBg} />
      <div aria-hidden className={styles.meshNoise} />

      {/* Optional cover photo — layered on top of mesh */}
      {useNextImage && bgImage && (
        <Image
          src={bgImage}
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="object-cover opacity-20 mix-blend-luminosity"
          aria-hidden
        />
      )}
      {usePlainImg && bgImage && (
        <Image
          unoptimized
          src={bgImage}
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="object-cover opacity-20 mix-blend-luminosity"
          referrerPolicy="no-referrer"
          aria-hidden
        />
      )}
      <div aria-hidden className={styles.meshFade} />

      {/* ── Inner Content ─────────────────────────────────────── */}
      <div className={styles.inner}>
        {/* Top row: avatar left, badge right */}
        <div>
          <div className={styles.topRow}>
            <div className={styles.avatarRing}>
              <AuthorAvatar
                size="xl"
                imgUrl={avatar}
                userName={name}
                containerClassName="rounded-full"
              />
            </div>

            <span className={styles.roleBadge} aria-label="وضعیت نویسنده">
              <span className={styles.roleDot} aria-hidden />
              نویسنده فعال
            </span>
          </div>

          {/* Giant name */}
          <div className={styles.nameBlock}>
            <h1 className={styles.authorName}>{name}</h1>
            {/* Animated SVG underline stroke — signature moment */}
            <svg
              className={styles.nameSvg}
              viewBox="0 0 520 10"
              fill="none"
              aria-hidden
              focusable="false"
            >
              <path
                d="M4 7 C130 2, 260 9, 390 5 S480 2, 516 6"
                stroke="url(#nameGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                className={styles.nameSvgStroke}
              />
              <defs>
                <linearGradient id="nameGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="oklch(65% 0.18 200)" />
                  <stop offset="50%"  stopColor="oklch(62% 0.2 280)" />
                  <stop offset="100%" stopColor="oklch(72% 0.16 60)" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Chips: job + company */}
          {(job || company) && (
            <div className={styles.metaRow}>
              {job && (
                <span className={styles.chip}>
                  <Briefcase className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                  {job}
                </span>
              )}
              {company && (
                <span className={styles.chip}>
                  <Building2 className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                  {company}
                </span>
              )}
            </div>
          )}

          {/* Bio */}
          {bio && <p className={styles.bio}>{bio}</p>}
        </div>
      </div>

      {/* ── 4-Column Stat Strip ───────────────────────────────── */}
      <div className={styles.statsStrip} role="list" aria-label="آمار نویسنده">
        {stats.map((stat) => (
          <div key={stat.label} role="listitem" className={styles.statCell}>
            <span aria-hidden className={styles.statPip} />
            <span className={cn(styles.statValue, 'author-num')}>
              {toPersianNumber(stat.value)}
            </span>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AuthorProfileHero;
