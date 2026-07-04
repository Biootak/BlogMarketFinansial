'use client';

/**
 * AsideTile — NOVA aside tile: top authors + system health.
 *
 * v2 "Quiet Confidence" (2026-07-03): replaced the static motivational
 * quotes with a real top-authors leaderboard. SystemHealth remains
 * embedded below.
 */

import SystemHealth from '@/components/Dashboard/DashboardPage/overview/SystemHealth';
import type { TopAuthor } from '@/actions/getTopAuthors';
import Image from 'next/image';
import { useMemo } from 'react';
import { HiOutlineUserGroup } from 'react-icons/hi2';

interface AsideTileProps {
  topAuthors: TopAuthor[];
}

export default function AsideTile({ topAuthors }: AsideTileProps) {
  const todayFa = useMemo(
    () =>
      new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(
        new Date(),
      ),
    [],
  );

  return (
    <section className="nova-tile nova-tile--aside" data-tone="amber" aria-label="نویسندگان برتر و سلامت سیستم">
      <header className="nova-panel__head nova-panel__head--tight">
        <div className="nova-panel__head-title">
          <span className="nova-panel__head-ico" aria-hidden>
            <HiOutlineUserGroup className="w-4 h-4" />
          </span>
          <h2 className="nova-panel__title">نویسندگان برتر</h2>
        </div>
        <span className="nova-aside__date tabular-nums" dir="ltr">
          {todayFa}
        </span>
      </header>

      {topAuthors.length === 0 ? (
        <p className="nova-aside__empty">نویسنده‌ای یافت نشد.</p>
      ) : (
        <ul className="nova-aside__authors">
          {topAuthors.map((author) => {
            const avatar = author.profile?.avatar ?? author.image;
            return (
              <li key={author.id} className="nova-aside__author">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt=""
                    width={32}
                    height={32}
                    className="nova-aside__avatar"
                    aria-hidden
                  />
                ) : (
                  <span className="nova-aside__avatar-fallback" aria-hidden>
                    {(author.name ?? '؟').charAt(0)}
                  </span>
                )}
                <div className="nova-aside__author-info">
                  <span className="nova-aside__author-name">{author.name ?? 'بدون نام'}</span>
                  {author.profile?.jobName && (
                    <span className="nova-aside__author-job">{author.profile.jobName}</span>
                  )}
                </div>
                <span className="nova-aside__post-count tabular-nums">
                  {author._count.posts.toLocaleString('fa-IR')} پست
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="nova-embed nova-aside__health">
        <SystemHealth />
      </div>
    </section>
  );
}
