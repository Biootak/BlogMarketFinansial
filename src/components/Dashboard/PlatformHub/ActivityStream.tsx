'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import s from './PlatformHub.module.css';

export type ActivityStreamTone =
  | 'emerald'
  | 'indigo'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'violet'
  | 'neutral';

export type ActivityStreamItem = {
  id: string;
  /** Rendered with an icon glyph (Lucide recommended) */
  icon?: React.ReactNode;
  /** Short title */
  title: string;
  /** Optional supporting line */
  detail?: string;
  /** ISO timestamp string */
  at: string;
  tone?: ActivityStreamTone;
  /** Optional right-aligned meta (counts, status) */
  meta?: React.ReactNode;
};

interface ActivityStreamProps {
  items: ActivityStreamItem[];
  emptyLabel?: string;
  maxHeight?: number;
  className?: string;
}

/**
 * ActivityStream — chronological feed with type-coded glyphs.
 * - sticky rail on the inline-start edge (visual spine)
 * - relative time (format via Intl)
 * - new items briefly highlight (anim-fade-in-up)
 * - pauses on hover for read
 */
export function ActivityStream({
  items,
  emptyLabel = 'فعالیتی ثبت نشده است.',
  maxHeight = 480,
  className,
}: ActivityStreamProps) {
  const [pulseId, setPulseId] = useState<string | null>(null);
  const lastIdRef = useRef<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    const first = items[0]?.id;
    if (first && first !== lastIdRef.current) {
      setPulseId(first);
      const t = setTimeout(() => setPulseId(null), 1400);
      lastIdRef.current = first;
      return () => clearTimeout(t);
    }
    lastIdRef.current = first ?? null;
    return;
  }, [items]);

  if (items.length === 0) {
    return <div className={cn(s.activityEmpty, className)}>{emptyLabel}</div>;
  }

  return (
    <ol
      className={cn(s.activityStream, className)}
      style={{ maxHeight: `${maxHeight}px` }}
    >
      {items.map((it) => (
        <li
          key={it.id}
          className={s.activityItem}
          data-tone={it.tone ?? 'neutral'}
          data-pulse={pulseId === it.id}
        >
          <span className={s.activityGlyph} aria-hidden>
            {it.icon ?? <span className={s.activityDot} />}
          </span>
          <div className={s.activityBody}>
            <div className={s.activityTitle}>{it.title}</div>
            {it.detail ? <div className={s.activityDetail}>{it.detail}</div> : null}
          </div>
          <div className={s.activityMeta}>
            {it.meta}
            <span className={s.activityTime}>{formatRelative(it.at)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '—';
  const diff = Date.now() - d;
  if (diff < 60_000) return 'لحظاتی پیش';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} دقیقه پیش`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ساعت پیش`;
  return `${Math.floor(diff / 86_400_000)} روز پیش`;
}
