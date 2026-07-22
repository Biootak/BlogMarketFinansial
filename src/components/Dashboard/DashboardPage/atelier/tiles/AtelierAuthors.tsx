'use client';

/**
 * AtelierAuthors — top authors leaderboard (2026-07-04 redesign v2).
 *
 * چیدمان: ۵ ستون تمیز در یک ردیف — rank + avatar + name/job + post count
 * + views/post. حذف mini sparkline از grid چون در 60px فضا نامرئی بود
 * و باعث overlap بین ستون‌ها می‌شد.
 *
 * Visual identity:
 *   • سرصفحه: title + subline (نام ماه جاری) + total chip.
 *   • لیست: ۵ ستون منظم — rank + avatar + name/job (flex) + post count
 *     + avg views/post — هر کدام با border-block-end hairline بین rows.
 *   • Author #1: ring طلایی اطراف avatar + crown badge ۱۴px + رنگ طلایی
 *     برای post count (لید = برجسته).
 *   • اگه لیست خالی باشه: centered empty message.
 *
 * دلیل مکان (ردیف ۷، full-width compact):
 *   metadata است؛ real-time نیست. بعد از real-time (Posts + Activity در
 *   ردیف ۶) می‌آید. عرض کامل فضای کافی برای هر ۵ ستون بدون overlap
 *   فراهم می‌کند.
 */

import type { TopAuthor } from '@/actions/getTopAuthors';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useMemo } from 'react';
import { HiOutlineUserGroup } from 'react-icons/hi2';
import { fmt, persianShortDate } from '../utils';

interface AtelierAuthorsProps {
  topAuthors: TopAuthor[];
}

export default function AtelierAuthors({ topAuthors }: AtelierAuthorsProps) {
  const rows = useMemo(() => {
    return topAuthors.slice(0, 6).map((author, i) => {
      const isLead = i === 0;
      return { author, rank: i + 1, avgViews: author.avgViewsPerPost, isLead };
    });
  }, [topAuthors]);

  return (
    <section className="at-tile at-authors" aria-label="نویسندگان برتر">
      <header className="at-head">
        <div className="at-head__title">
          <span className="at-head__ico" aria-hidden>
            <HiOutlineUserGroup className="w-3.5 h-3.5" />
          </span>
          <div className="at-head__text">
            <h2 className="at-head__title-text">نویسندگان برتر</h2>
            <p className="at-head__sub" dir="ltr">
              {persianShortDate()}
            </p>
          </div>
        </div>

        {topAuthors.length > 0 && (
          <span className="at-authors__meta">
            <span className="at-authors__meta-num tabular-nums">{fmt(topAuthors.length)}</span>
            <span className="at-authors__meta-label">نویسنده</span>
          </span>
        )}
      </header>

      {rows.length === 0 ? (
        <p className="at-authors__empty">نویسنده‌ای یافت نشد.</p>
      ) : (
        <ol className="at-authors__list">
          {rows.map(({ author, rank, avgViews, isLead }) => {
            const avatar = author.profile?.avatar ?? author.image;
            return (
              <li
                key={author.id}
                className={cn('at-author', isLead && 'is-lead')}
                aria-label={`نویسندهٔ ${rank}`}
              >
                <span className="at-author__rank" aria-hidden>
                  {fmt(rank).padStart(2, '۰')}
                </span>

                <span className="at-author__avatar" aria-hidden>
                  {avatar ? (
                    <Image src={avatar} alt="" width={36} height={36} />
                  ) : (
                    (author.name ?? '؟').charAt(0)
                  )}
                  {isLead && <span className="at-author__avatar-crown" aria-hidden />}
                </span>

                <span className="at-author__body">
                  <span className="at-author__name">{author.name ?? 'بدون نام'}</span>
                  {author.profile?.jobName && (
                    <span className="at-author__meta">{author.profile.jobName}</span>
                  )}
                </span>

                <span className="at-author__stat">
                  <span className="at-author__stat-num tabular-nums">
                    {fmt(author._count.posts)}
                  </span>
                  <span className="at-author__stat-sub">پست</span>
                </span>

                <span className="at-author__views">
                  <span className="at-author__views-num tabular-nums">{fmt(avgViews)}</span>
                  <span className="at-author__views-sub">بازدید / پست</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
