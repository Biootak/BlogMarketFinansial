'use client';

import { toPersianDigits } from '@/lib/setup/format';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import s from '../jobs.module.css';

export interface JobStreamItem {
  id: string;
  type: string;
  queue: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'dead';
  updatedAt: string;
  attempts: number;
  durationMs?: number | null;
}

export interface JobStreamProps {
  items: JobStreamItem[];
}

type StreamFilter = 'all' | 'completed' | 'failed' | 'running' | 'pending' | 'dead';

const FILTERS: { key: StreamFilter; label: string }[] = [
  { key: 'all', label: 'همه' },
  { key: 'running', label: 'در حال اجرا' },
  { key: 'pending', label: 'منتظر' },
  { key: 'completed', label: 'تکمیل' },
  { key: 'failed', label: 'خطا' },
  { key: 'dead', label: 'مرده' },
];

const STATUS_DOT_CLASS: Record<JobStreamItem['status'], string> = {
  pending: 'streamDot--pending',
  running: 'streamDot--running',
  completed: 'streamDot--completed',
  failed: 'streamDot--failed',
  dead: 'streamDot--dead',
};

const STATUS_LABEL: Record<JobStreamItem['status'], string> = {
  pending: 'منتظر',
  running: 'در حال اجرا',
  completed: 'تکمیل',
  failed: 'خطا',
  dead: 'مرده',
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${toPersianDigits(Math.round(ms))}ms`;
  if (ms < 60_000) return `${toPersianDigits((ms / 1000).toFixed(1))}s`;
  if (ms < 3_600_000) return `${toPersianDigits(Math.round(ms / 60_000))}m`;
  return `${toPersianDigits((ms / 3_600_000).toFixed(1))}h`;
}

function formatRelative(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${toPersianDigits(sec)} ث پیش`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${toPersianDigits(min)} د پیش`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${toPersianDigits(hr)} س پیش`;
  const day = Math.floor(hr / 24);
  return `${toPersianDigits(day)} ر پیش`;
}

export function JobStream({ items }: JobStreamProps) {
  const [filter, setFilter] = useState<StreamFilter>('all');

  const counts = useMemo(() => {
    const c: Record<StreamFilter, number> = {
      all: items.length,
      completed: 0,
      failed: 0,
      running: 0,
      pending: 0,
      dead: 0,
    };
    for (const it of items) c[it.status] += 1;
    return c;
  }, [items]);

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((it) => it.status === filter)),
    [items, filter],
  );

  return (
    <div className={s.card}>
      <div className={s.cardHeader}>
        <div className={s.cardTitleBlock}>
          <span className={s.cardEyebrow}>Live Stream</span>
          <span className={s.cardTitle}>جریان زنده job ها</span>
        </div>
        <span className={s.streamCount}>{toPersianDigits(filtered.length)} مورد</span>
      </div>
      <div className={s.streamFilters}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={
              filter === f.key ? `${s.streamPill} ${s['streamPill--active']}` : s.streamPill
            }
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
          >
            {f.label}
            <span className={s.streamPillCount}>{toPersianDigits(counts[f.key])}</span>
          </button>
        ))}
      </div>
      <div className={`${s.cardBody} ${s['cardBody--scrollable']}`}>
        {filtered.length === 0 ? (
          <p className={s.tableEmpty}>موردی با این فیلتر یافت نشد.</p>
        ) : (
          <ul className={s.streamList}>
            {filtered.map((it) => (
              <li key={it.id}>
                <Link href={`/dashboard/jobs/${it.id}`} className={s.streamItem}>
                  <span
                    className={`${s.streamDot} ${s[STATUS_DOT_CLASS[it.status]]}`}
                    aria-hidden="true"
                  />
                  <div className={s.streamBody}>
                    <div className={s.streamTitle}>
                      <span className={s.streamType}>{it.type}</span>
                      <span className={s.streamMeta}>{it.queue}</span>
                    </div>
                    <div className={s.streamMeta}>
                      <span>{STATUS_LABEL[it.status]}</span>
                      {it.attempts > 1 ? <span>تلاش {toPersianDigits(it.attempts)}</span> : null}
                      {it.durationMs != null ? <span>{formatDuration(it.durationMs)}</span> : null}
                    </div>
                  </div>
                  <span className={s.streamTime}>{formatRelative(it.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default JobStream;
