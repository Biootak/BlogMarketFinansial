import styles from '@/components/AuthorsHub/AuthorProfileHero.module.css';
import { cn, toPersianNumber } from '@/lib/utils';
import {
  Briefcase,
  Building2,
  FileText,
  FolderOpen,
  Mail,
  MessageSquare,
  ThumbsUp,
} from 'lucide-react';
import Image from 'next/image';
import type * as React from 'react';

/**
 * @file AuthorProfileHero
 * @description «Masthead Ledger» — financial-editorial author masthead.
 *
 * Mobile-first. Domain language of the hub: chart-paper ledger grid,
 * hairline-ruled stats ticker, hand-drawn name rule with brand gradient.
 * All colors from --ds-* tokens (adaptive light/dark). Logical properties
 * only → RTL-correct, icons flow with the text direction.
 *
 * Server-renderable. No client JS. Real data only (server-fetched props).
 */

/**
 * Normalize image URLs similar to SafeImage
 * - Handle placehold.co SVG → PNG conversion
 * - Remove conflicting query params from unsplash
 */
function normalizeImageUrl(src: string): string {
  if (src.startsWith('https://placehold.co/')) {
    const queryIdx = src.indexOf('?');
    const base = queryIdx === -1 ? src : src.slice(0, queryIdx);
    if (/\.(png|jpg|jpeg|webp|gif)$/i.test(base)) return src;
    const query = queryIdx === -1 ? '' : src.slice(queryIdx);
    return `${base}.png${query}`;
  }

  if (src.includes('images.unsplash.com')) {
    try {
      const u = new URL(src);
      u.searchParams.delete('w');
      u.searchParams.delete('q');
      u.searchParams.delete('auto');
      u.searchParams.delete('fit');
      u.searchParams.delete('crop');
      u.searchParams.delete('ixlib');
      u.searchParams.delete('ixid');
      u.searchParams.delete('cs');
      return u.toString();
    } catch {
      return src;
    }
  }

  return src;
}

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

/** Pick the best available photo: bgImage → avatar */
const pickPhoto = (profile?: AuthorProfileHeroAuthor['profile']): string | null => {
  const bg = profile?.bgImage?.trim();
  const av = profile?.avatar?.trim();
  return bg || av || null;
};

const AuthorProfileHero: React.FC<AuthorProfileHeroProps> = ({
  author,
  categoryCount = 0,
  commentCount = 0,
  likeCount = 0,
  className,
}) => {
  const name      = author.name?.trim() || 'نویسنده';
  const job       = author.profile?.jobName;
  const company   = author.profile?.company;
  const bio       = author.profile?.bio;
  const photo     = pickPhoto(author.profile);
  const postCount = author._count?.posts ?? 0;
  // Real status — derived from actual published posts, not hardcoded.
  const isActive  = postCount > 0;

  const stats = [
    { key: 'posts',     icon: FileText,      label: 'مقاله',     value: postCount },
    { key: 'categories', icon: FolderOpen,   label: 'دسته‌بندی', value: categoryCount },
    { key: 'comments',  icon: MessageSquare, label: 'کامنت',     value: commentCount },
    { key: 'likes',     icon: ThumbsUp,      label: 'لایک',      value: likeCount },
  ] as const;

  return (
    <section dir="rtl" className={cn(styles.hero, className)} aria-label={`پروفایل ${name}`}>

      {/* ══ ATMOSPHERE — ledger grid + brand aurora ═════════════════ */}
      <div className={styles.ledgerGrid} aria-hidden />
      <div className={styles.aura} aria-hidden />

      {/* ══ BODY ════════════════════════════════════════════════════ */}
      <div className={styles.heroBody}>

        {/* ══ PORTRAIT — compact 4/5 card ══════════════════════════ */}
        <div className={styles.avatarRing}>
          <div className={styles.avatarCard}>
            {photo ? (
              <Image
                src={normalizeImageUrl(photo)}
                alt={name}
                fill
                priority
                sizes="(min-width: 1024px) 220px, 96px"
                className={styles.avatarImg}
              />
            ) : (
              <span className={styles.avatarFallback} aria-hidden>
                {name.charAt(0)}
              </span>
            )}
          </div>
        </div>

        {/* ══ CONTENT ══════════════════════════════════════════════ */}
        <div className={styles.contentCol}>

          {/* Topline — kicker · hairline · status badge */}
          <div className={styles.topline}>
            {job && <span className={styles.kicker}>{job}</span>}
            <span className={styles.hairline} aria-hidden />
            <span className={styles.roleBadge} aria-label="وضعیت نویسنده">
              <span className={styles.roleDot} aria-hidden />
              {isActive ? 'نویسنده فعال' : 'نویسنده'}
            </span>
          </div>

          {/* Name + hand-drawn signature rule */}
          <div className={styles.nameBlock}>
            <h1 className={styles.name}>{name}</h1>
            <svg
              className={styles.nameRule}
              viewBox="0 0 520 10"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M4 7 C130 2, 260 9, 390 5 S480 2, 516 6"
                stroke="url(#nameGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="nameGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" className={styles.gradStart} />
                  <stop offset="50%" className={styles.gradMid} />
                  <stop offset="100%" className={styles.gradEnd} />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Meta chips — real profile data */}
          {(job || company) && (
            <div className={styles.metaRow}>
              {job && (
                <span className={styles.chip}>
                  <Briefcase className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                  {job}
                </span>
              )}
              {company && (
                <span className={styles.chip}>
                  <Building2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                  {company}
                </span>
              )}
            </div>
          )}

          {/* Bio */}
          {bio && <p className={styles.bio}>{bio}</p>}

          {/* Stats ticker — real aggregated counts */}
          <div className={styles.statsStrip} aria-label="آمار نویسنده">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.key} className={styles.statCell}>
                  <span className={styles.statIcon}>
                    <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  </span>
                  <span className={styles.statText}>
                    <span className={styles.statValue}>{toPersianNumber(s.value)}</span>
                    <span className={styles.statLabel}>{s.label}</span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Action — only when a real contact address exists */}
          {author.email && (
            <div className={styles.actions}>
              <a href={`mailto:${author.email}`} className={styles.cta}>
                <Mail className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                <span>تماس با نویسنده</span>
              </a>
            </div>
          )}

        </div>
      </div>

    </section>
  );
};

export default AuthorProfileHero;
