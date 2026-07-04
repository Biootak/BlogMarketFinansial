'use client';

/**
 * AtelierAuthors — top authors leaderboard.
 *
 * Avatar + name + post count. The #1 author gets a tiny gold "تاج"
 * mark; the rest stay neutral. Rows are slightly more spaced than
 * the editorial version, giving the panel room to breathe next to
 * the denser market grid.
 */

import type { TopAuthor } from '@/actions/getTopAuthors';
import Image from 'next/image';
import { HiOutlineUserGroup } from 'react-icons/hi2';
import { fmt, persianShortDate } from '../utils';

interface AtelierAuthorsProps {
  topAuthors: TopAuthor[];
}

export default function AtelierAuthors({ topAuthors }: AtelierAuthorsProps) {
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
      </header>

      {topAuthors.length === 0 ? (
        <p className="at-posts__empty">نویسنده‌ای یافت نشد.</p>
      ) : (
        <ol className="at-authors__list">
          {topAuthors.map((author, i) => {
            const avatar = author.profile?.avatar ?? author.image;
            return (
              <li
                key={author.id}
                className={`at-author ${i === 0 ? 'is-lead' : ''}`}
              >
                <span className="at-author__rank">
                  {(i + 1).toLocaleString('fa-IR')}
                </span>
                <span className="at-author__avatar" aria-hidden>
                  {avatar ? (
                    <Image src={avatar} alt="" width={36} height={36} />
                  ) : (
                    (author.name ?? '؟').charAt(0)
                  )}
                </span>
                <span className="at-author__body">
                  <span className="at-author__name">{author.name ?? 'بدون نام'}</span>
                  {author.profile?.jobName && (
                    <span className="at-author__meta">{author.profile.jobName}</span>
                  )}
                </span>
                <span className="at-author__stat">
                  {fmt(author._count.posts)}
                  <span className="at-author__stat-sub">پست</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
