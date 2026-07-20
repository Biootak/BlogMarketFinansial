'use client';

/**
 * EditorialAuthors — top authors leaderboard.
 *
 * Avatar + name + post count. No gradient rank badges — pure typography.
 */

import type { TopAuthor } from '@/actions/getTopAuthors';
import Image from 'next/image';
import { useMemo } from 'react';
import { HiOutlineUserGroup } from 'react-icons/hi2';
import { fmt } from '../utils';

interface EditorialAuthorsProps {
  topAuthors: TopAuthor[];
}

export default function EditorialAuthors({ topAuthors }: EditorialAuthorsProps) {
  const todayFa = useMemo(
    () =>
      new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(
        new Date(),
      ),
    [],
  );

  return (
    <section className="ec-tile ec-authors" aria-label="نویسندگان برتر">
      <header className="ec-head">
        <div className="ec-head__title">
          <span className="ec-head__ico" aria-hidden>
            <HiOutlineUserGroup className="w-3.5 h-3.5" />
          </span>
          <div className="ec-head__text">
            <h2 className="ec-head__title-text">نویسندگان برتر</h2>
            <p className="ec-head__sub" dir="ltr">
              {todayFa}
            </p>
          </div>
        </div>
      </header>

      {topAuthors.length === 0 ? (
        <p className="ec-posts__empty">نویسنده‌ای یافت نشد.</p>
      ) : (
        <ul className="ec-posts__list">
          {topAuthors.map((author) => {
            const avatar = author.profile?.avatar ?? author.image;
            return (
              <li key={author.id} className="ec-author">
                <span className="ec-author__avatar" aria-hidden>
                  {avatar ? (
                    <Image src={avatar} alt="" width={32} height={32} />
                  ) : (
                    (author.name ?? '؟').charAt(0)
                  )}
                </span>
                <span className="ec-author__body">
                  <span className="ec-author__name">{author.name ?? 'بدون نام'}</span>
                  {author.profile?.jobName && (
                    <span className="ec-author__meta">{author.profile.jobName}</span>
                  )}
                </span>
                <span className="ec-author__stat">
                  {fmt(author._count.posts)}
                  <span className="ec-author__stat-sub">پست</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
