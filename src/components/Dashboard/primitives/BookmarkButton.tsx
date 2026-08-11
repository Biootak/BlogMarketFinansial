'use client';

/**
 * BookmarkButton — toggle bookmark for any page/resource.
 *
 * Persists to localStorage. Star icon with filled/empty states.
 * RTL-safe. Uses --nova-* tokens.
 *
 * Usage:
 *   <BookmarkButton id="posts-page" />
 *   <BookmarkButton id="customer-123" label="مشتری احمدی" />
 */

import { Bookmark } from 'lucide-react';
import { useEffect, useState } from 'react';
import s from './BookmarkButton.module.css';

const STORAGE_KEY = 'dash2:bookmarks';

function getBookmarks(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveBookmarks(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // quota error — ignore
  }
}

interface BookmarkButtonProps {
  /** Unique ID for this bookmark */
  id?: string;
  /** Accessibility label */
  label?: string;
  /** Size in pixels */
  size?: number;
  /** @deprecated alias for `id` — kept for existing call sites */
  pageKey?: string;
}

export function BookmarkButton({ id, pageKey, label, size = 18 }: BookmarkButtonProps) {
  const bookmarkId = pageKey ?? id ?? '';
  const [bookmarked, setBookmarked] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setBookmarked(getBookmarks().has(bookmarkId));
    setHydrated(true);
  }, [bookmarkId]);

  const toggle = () => {
    const next = !bookmarked;
    setBookmarked(next);
    const bookmarks = getBookmarks();
    if (next) bookmarks.add(bookmarkId);
    else bookmarks.delete(bookmarkId);
    saveBookmarks(bookmarks);
  };

  if (!hydrated) {
    return (
      <button
        type="button"
        className={s.root}
        aria-label={label ?? 'نشان‌کردن'}
        style={{ inlineSize: size, blockSize: size }}
      >
        <Bookmark size={size} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`${s.root} ${bookmarked ? s.bookmarked : ''}`}
      onClick={toggle}
      aria-label={label ?? (bookmarked ? 'حذف نشان' : 'نشان‌کردن')}
      aria-pressed={bookmarked}
      style={{ inlineSize: size, blockSize: size }}
    >
      {bookmarked ? <Bookmark size={size} fill="currentColor" /> : <Bookmark size={size} />}
    </button>
  );
}

/**
 * useBookmarks — get all bookmarked IDs (for a "Bookmarks" page/section).
 */
export function useBookmarks(): Set<string> {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setBookmarks(getBookmarks());
    setHydrated(true);
  }, []);

  // Listen for storage changes (other tabs/panels)
  useEffect(() => {
    if (!hydrated) return;
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setBookmarks(getBookmarks());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [hydrated]);

  return bookmarks;
}
