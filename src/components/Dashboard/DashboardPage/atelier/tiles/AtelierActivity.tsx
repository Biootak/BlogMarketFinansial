'use client';

/**
 * AtelierActivity — live activity feed.
 *
 * 2026-07-04 (evening) — بازطراحی با avatar و filter pill.
 *
 * Visual identity:
 *   • سرصفحه با فیلتر سه‌حالته (همه/پست‌ها/کاربران) به‌صورت pill
 *     که در سمت راست نشسته؛ انتخاب در `localStorage[at:activity-filter]`
 *     ذخیره می‌شود.
 *   • Day-grouped timeline (قبلاً بود): today / yesterday / this-week
 *     / older. ستون سمت راست timeline با hairline به هم متصل.
 *   • هر آیتم: avatar ۲۸px + tone-colored dot + action text + relative
 *     time. avatar از `item.user.avatar` استفاده می‌کند با fallback
 *     حرف اول نام. ring اطراف avatar فقط برای tone «up» (تایید).
 *   • action pill خیلی کوچک کنار dot (پست/نظر/کاربر) برای اسکن
 *     سریع‌تر — یعنی چشم کاربر قبل از خواندن متن می‌فهمد چه نوع
 *     فعالیتی است.
 *
 * دلیل مکان (ردیف ۶، عرض ۴/۱۲):
 *   عرض کمتر از Posts چون فقط timeline + avatar هست (نه Featured
 *   card بزرگ). real-time است و باید در مجاورت Posts (ردیف ۶)
 *   باشد تا کاربر یک «stream view» واحد از محتوای اخیر داشته باشد.
 */

import type { ActivityEntry } from '@/actions/getRecentActivity';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineBolt,
  HiOutlineChatBubbleLeftRight,
  HiOutlineDocumentText,
  HiOutlineInbox,
  HiOutlinePencilSquare,
  HiOutlineUserPlus,
} from 'react-icons/hi2';
import { formatRelativeFa } from '../utils';

const _faNum = new Intl.NumberFormat('fa-IR');

/** ActivityItem = alias for ActivityEntry so callers can import either */
export type ActivityItem = ActivityEntry;

type Tone = 'up' | 'info' | 'warn' | 'danger';

function actionTone(action: string): Tone {
  if (/(حذف|خطا|ناموفق)/.test(action)) return 'danger';
  if (/(تأیید|انتشار|ایجاد|جدید|افزودن|عضو)/.test(action)) return 'up';
  if (/(ویرایش|بروز|به‌روز)/.test(action)) return 'info';
  if (/(هشدار|توجه|صبر)/.test(action)) return 'warn';
  return 'info';
}

/** دسته‌بندی فعالیت برای filter pill. */
function actionCategory(action: string): 'post' | 'comment' | 'user' | 'other' {
  if (/(پست|مقاله|انتشار|پیش‌نویس|نوشت)/.test(action)) return 'post';
  if (/(نظر|پاسخ|دیدگاه)/.test(action)) return 'comment';
  if (/(کاربر|عضو|نقش|ورود)/.test(action)) return 'user';
  return 'other';
}

interface DayGroup {
  label: string;
  tone: 'today' | 'yesterday' | 'week' | 'older';
  items: ActivityItem[];
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayLabelFa(d: Date, now: Date): { label: string; tone: DayGroup['tone'] } {
  if (isSameDay(d, now)) return { label: 'امروز', tone: 'today' };
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) return { label: 'دیروز', tone: 'yesterday' };
  const dayDiff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (dayDiff < 7) return { label: 'این هفته', tone: 'week' };
  return {
    label: d.toLocaleDateString('fa-IR', { month: 'long', year: 'numeric' }),
    tone: 'older',
  };
}

type CategoryFilter = 'all' | 'post' | 'user' | 'comment';

const CATEGORY_LABEL: Record<CategoryFilter, string> = {
  all: 'همه',
  post: 'پست‌ها',
  user: 'کاربران',
  comment: 'نظرات',
};

const FILTER_STORAGE_KEY = 'at:activity-filter';

function loadStoredFilter(): CategoryFilter {
  if (typeof window === 'undefined') return 'all';
  try {
    const raw = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (raw === 'all' || raw === 'post' || raw === 'user' || raw === 'comment') return raw;
  } catch {
    // ignore
  }
  return 'all';
}

interface AtelierActivityProps {
  items: ActivityItem[];
}

export default function AtelierActivity({ items }: AtelierActivityProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>('all');

  useEffect(() => {
    setNow(new Date());
    let id: number | null = null;
    const start = () => {
      id = window.setInterval(() => setNow(new Date()), 60_000);
    };
    const stop = () => {
      if (id !== null) {
        window.clearInterval(id);
        id = null;
      }
    };
    start();
    const onVis = () => {
      if (document.hidden) {
        stop();
      } else {
        setNow(new Date());
        start();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  }, []);

  useEffect(() => {
    setFilter(loadStoredFilter());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(FILTER_STORAGE_KEY, filter);
    } catch {
      // ignore
    }
  }, [filter]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((it) => actionCategory(it.action) === filter);
  }, [items, filter]);

  const grouped = useMemo<DayGroup[]>(() => {
    if (!now) return [];
    const sorted = [...filteredItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const map = new Map<string, DayGroup>();
    for (const it of sorted) {
      const meta = dayLabelFa(new Date(it.createdAt), now);
      const key = `${meta.tone}-${meta.label}`;
      if (!map.has(key)) map.set(key, { label: meta.label, tone: meta.tone, items: [] });
      map.get(key)?.items.push(it);
    }
    return Array.from(map.values());
  }, [filteredItems, now]);

  const total = grouped.reduce((acc, g) => acc + g.items.length, 0);

  // شمارنده‌های هر فیلتر برای نمایش در pill.
  const counts = useMemo(() => {
    const c: Record<'all' | 'post' | 'user' | 'comment', number> = {
      all: items.length,
      post: 0,
      user: 0,
      comment: 0,
    };
    for (const it of items) {
      const cat = actionCategory(it.action);
      if (cat === 'post' || cat === 'user' || cat === 'comment') c[cat]++;
    }
    return c;
  }, [items]);

  return (
    <section className="at-tile at-activity" aria-label="جریان فعالیت">
      <header className="at-head">
        <div className="at-head__title">
          <span className="at-head__ico" aria-hidden>
            <HiOutlineBolt className="w-3.5 h-3.5" />
          </span>
          <div className="at-head__text">
            <h2 className="at-head__title-text">فعالیت اخیر</h2>
            <p className="at-head__sub">{total > 0 ? `${fmt(total)} مورد` : 'بدون فعالیت'}</p>
          </div>
        </div>

        <div className="at-activity__filters" role="radiogroup" aria-label="فیلتر فعالیت‌ها">
          {(['all', 'post', 'user', 'comment'] as CategoryFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={filter === key}
              onClick={() => setFilter(key)}
              className={cn('at-activity__filter', filter === key && 'is-active')}
            >
              <span>{CATEGORY_LABEL[key]}</span>
              <span className="tabular-nums at-activity__filter-count">{fmt(counts[key])}</span>
            </button>
          ))}
        </div>
      </header>

      {grouped.length === 0 ? (
        <p className="at-activity__empty">
          <HiOutlineInbox className="w-4 h-4 inline-block align-middle" aria-hidden />{' '}
          {filter === 'all'
            ? 'هنوز فعالیتی ثبت نشده است.'
            : `هیچ فعالیت ${CATEGORY_LABEL[filter].replace('ها', '')}ای یافت نشد.`}
        </p>
      ) : (
        <ol className="at-activity__list">
          {grouped.map((group) => (
            <li key={`${group.tone}-${group.label}`} className="at-activity__group">
              <p className={cn('at-activity__group-label', `is-${group.tone}`)}>
                <span>{group.label}</span>
                <span className="tabular-nums">{fmt(group.items.length)}</span>
              </p>
              <ol className="at-activity__items">
                {group.items.map((item) => {
                  const tone = actionTone(item.action);
                  const cat = actionCategory(item.action);
                  const userName = item.user?.name ?? 'کاربر';
                  const initials = userName.charAt(0);
                  const avatar =
                    (item.user as unknown as { avatar?: string | null } | null)?.avatar ?? null;
                  const CatIcon =
                    cat === 'post'
                      ? HiOutlineDocumentText
                      : cat === 'comment'
                        ? HiOutlineChatBubbleLeftRight
                        : cat === 'user'
                          ? HiOutlineUserPlus
                          : HiOutlinePencilSquare;
                  return (
                    <li key={item.id} className="at-activity__item">
                      <span className="at-activity__avatar" aria-hidden>
                        {avatar ? (
                          <Image
                            src={avatar}
                            alt=""
                            width={28}
                            height={28}
                            className="at-activity__avatar-img"
                          />
                        ) : (
                          <span className="at-activity__avatar-initials">{initials}</span>
                        )}
                        {tone === 'up' && <span className="at-activity__avatar-ring" aria-hidden />}
                      </span>
                      <span className={cn('at-activity__dot', `is-${tone}`)} aria-hidden />
                      <span className="at-activity__body">
                        <p className="at-activity__text">
                          <strong>{userName}</strong> {item.action}
                        </p>
                        <p className="at-activity__time">
                          <CatIcon className="w-3 h-3 inline-block align-middle" aria-hidden />{' '}
                          {now ? formatRelativeFa(new Date(item.createdAt), now) : '—'}
                        </p>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// Helper to format Persian numerals — re-exported from utils inline to avoid
// a circular import in test files.
function fmt(n: number): string {
  return _faNum.format(n);
}
