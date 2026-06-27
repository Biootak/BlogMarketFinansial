import { ChevronLeft, Eye, MessagesSquare } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { SafeImage } from '@/components/SafeImage';
import { getPostLink } from '@/lib/getPostLink';
import type { PostWithRelations, TaxonomyType } from '@/types/types';
import type { Crumb } from './ArchiveBreadcrumb';

/**
 * AtelierMasthead — the archive hero (2026).
 * Pairs the section intro (title, lead, real stats, quick links) with the
 * featured story rendered as a large cinematic image so the header never
 * reads as empty. Fully RTL, server-rendered.
 */
type Props = {
  crumbs: Crumb[];
  indexLabel: string;
  kicker: string;
  title: string;
  titleAccent?: string;
  lead: string;
  total: number;
  currentPage: number;
  totalPages: number;
  categoryCount: number;
  quickPickCategories: TaxonomyType[];
  showQuickLinks: boolean;
  featuredPost: PostWithRelations | null;
};

function fa(n: number) {
  return n.toLocaleString('fa-IR');
}
function compactFa(n: number) {
  if (n >= 1000) return `${(n / 1000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}K`;
  return n.toLocaleString('fa-IR');
}

export default function AtelierMasthead({
  crumbs,
  indexLabel,
  kicker,
  title,
  titleAccent,
  lead,
  total,
  currentPage,
  totalPages,
  categoryCount,
  quickPickCategories,
  showQuickLinks,
  featuredPost,
}: Props) {
  const fp = featuredPost && featuredPost.slug ? featuredPost : null;
  const fpLink = fp ? getPostLink(fp.postType, fp.slug) : '#';
  const fpCategory = fp?.categories?.[0];
  const fpViews = fp?.viewCount ?? 0;
  const fpComments = fp?._count?.comments ?? 0;

  return (
    <div className="container" style={{ marginTop: 'var(--ds-space-5)' }}>
      <nav aria-label="مسیر ناوبری" style={{ marginBottom: 'var(--ds-space-4)' }}>
        <ol className="atl-crumbs">
          {crumbs.map((c, i) => {
            const isLast = c.current ?? i === crumbs.length - 1;
            return (
              <li
                key={`${c.href}-${i}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--ds-space-2)' }}
              >
                {i > 0 ? (
                  <span className="atl-crumbs__sep" aria-hidden>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </span>
                ) : null}
                {isLast ? (
                  <span className="atl-crumbs__current" aria-current="page">
                    {c.label}
                  </span>
                ) : (
                  <Link href={c.href} prefetch>
                    {c.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <header className={`atl-hero atl-reveal${fp ? '' : ' atl-hero--solo'}`}>
        {/* Intro side */}
        <div className="atl-hero__intro">
          <p className="atl-hero__index">
            <span aria-hidden>—</span>
            <span>{indexLabel}</span>
          </p>

          <span className="atl-hero__kicker">
            <span className="atl-dot" aria-hidden />
            <span>{kicker}</span>
          </span>

          <h1 className="atl-title">
            {title}
            {titleAccent ? <span className="atl-title__accent"> {titleAccent}</span> : null}
          </h1>

          <p className="atl-lead">{lead}</p>

          {showQuickLinks && quickPickCategories.length > 0 ? (
            <div className="atl-quicklinks">
              <span className="atl-quicklinks__label">مرور سریع</span>
              {quickPickCategories.map((cat) => (
                <Link key={cat.id} href={`/archive/category/${cat.slug}`} className="atl-chip">
                  <span>{cat.name}</span>
                  {typeof cat.count === 'number' ? (
                    <span className="atl-chip__count">{fa(cat.count)}</span>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : null}

          <dl className="atl-stats">
            <div className="atl-stat">
              <dt className="sr-only">تعداد مقالات</dt>
              <dd className="atl-stat__num">{fa(total)}</dd>
              <span className="atl-stat__label">مقاله در این مجموعه</span>
            </div>
            <div className="atl-stat">
              <dt className="sr-only">دسته‌بندی‌ها</dt>
              <dd className="atl-stat__num">{fa(categoryCount)}</dd>
              <span className="atl-stat__label">دسته‌بندی فعال</span>
            </div>
            {totalPages > 1 ? (
              <div className="atl-stat">
                <dt className="sr-only">صفحه</dt>
                <dd className="atl-stat__num">
                  {fa(currentPage)}
                  <span style={{ color: 'var(--ds-text-muted)', fontWeight: 400 }}>
                    {' / '}
                    {fa(totalPages)}
                  </span>
                </dd>
                <span className="atl-stat__label">صفحه‌ی جاری</span>
              </div>
            ) : null}
          </dl>
        </div>

        {/* Feature side — the lead story */}
        {fp ? (
          <Link href={fpLink} className="atl-hero__feature" aria-label={fp.title}>
            <SafeImage
              src={fp.featuredImage}
              alt={fp.title || ''}
              ratio="4/3"
              containerClassName="absolute inset-0"
              sizes="(min-width: 1024px) 55vw, 100vw"
              priority
              className="object-cover"
            />
            <span className="atl-hero__scrim" aria-hidden />
            <div className="atl-hero__feature-body">
              <span className="atl-hero__feature-eyebrow">
                <span aria-hidden>✦</span>
                {fpCategory ? fpCategory.name : 'انتخاب سردبیر'}
              </span>
              <h2 className="atl-hero__feature-title">{fp.title}</h2>
              <div className="atl-hero__feature-meta">
                {fp.author ? <span>{fp.author.name}</span> : null}
                {fpComments > 0 ? (
                  <span>
                    <MessagesSquare className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
                    {fa(fpComments)}
                  </span>
                ) : null}
                <span>
                  <Eye className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
                  {compactFa(fpViews)}
                </span>
              </div>
            </div>
          </Link>
        ) : null}
      </header>
    </div>
  );
}
