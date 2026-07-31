'use client';

/**
 * TicketList — فهرست تیکت‌ها با چیدمان Editorial Broadcast.
 * -----------------------------------------------------------------
 *  چیدمان اختصاصی (نه DataTable ساده): هر ردیف یک "card-row" است که
 *  شامل: indicator اولویت (نوار رنگی) + subject + meta + badges.
 *  hover: lift + accent border. selected: indigo inset glow.
 */

import { cn } from '@/lib/utils';
import s from './TicketList.module.css';
import type { TicketSummary, TicketStatus, TicketPriority, TicketCategory } from '@/lib/tickets';

interface TicketListProps {
  tickets: TicketSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyHint?: string;
}

// ── minimal inline SVG icons (token-based) ──────────────────────
const IconTag = (props: { className?: string }) => (
  <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20.59 13.41l-7.18 7.18a2 2 0 0 1-2.82 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <circle cx="7" cy="7" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);
const IconMessage = (props: { className?: string }) => (
  <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconLock = (props: { className?: string }) => (
  <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'باز',
  pending: 'منتظر پاسخ',
  in_progress: 'در حال بررسی',
  resolved: 'حل شده',
  closed: 'بسته',
};

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: 'کم',
  normal: 'معمولی',
  high: 'بالا',
  urgent: 'فوری',
};

const CATEGORY_LABEL: Record<TicketCategory, string> = {
  general: 'عمومی',
  billing: 'مالی',
  technical: 'فنی',
  kyc: 'احراز هویت',
  account: 'حساب کاربری',
  transfer: 'انتقال وجه',
  rate: 'نرخ ارز',
  other: 'سایر',
};

const PRIORITY_TONE: Record<TicketPriority, 'rose' | 'amber' | 'indigo' | 'neutral'> = {
  urgent: 'rose',
  high: 'amber',
  normal: 'indigo',
  low: 'neutral',
};

const STATUS_TONE: Record<TicketStatus, 'cyan' | 'amber' | 'indigo' | 'emerald' | 'neutral'> = {
  open: 'cyan',
  pending: 'amber',
  in_progress: 'indigo',
  resolved: 'emerald',
  closed: 'neutral',
};

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '—';
  const diff = Date.now() - d;
  if (diff < 60_000) return 'لحظاتی پیش';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} دقیقه پیش`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ساعت پیش`;
  return `${Math.floor(diff / 86_400_000)} روز پیش`;
}

function toPersianNumber(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

export function TicketList({ tickets, selectedId, onSelect, emptyHint }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className={s.empty}>
        <span className={s.emptyDot} aria-hidden />
        <p>{emptyHint ?? 'تیکتی با این فیلتر یافت نشد.'}</p>
      </div>
    );
  }

  return (
    <ol className={s.list} role="list">
      {tickets.map((t) => {
        const isActive = t.id === selectedId;
        return (
          <li
            key={t.id}
            className={cn(s.row, isActive && s.rowActive)}
            data-active={isActive}
            data-priority={t.priority}
            onClick={() => onSelect(t.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(t.id);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={t.subject}
          >
            <span className={s.indicator} data-priority={t.priority} aria-hidden />
            <div className={s.body}>
              <div className={s.head}>
                <h3 className={s.subject}>{t.subject}</h3>
                <div className={s.badges}>
                  <span
                    className={s.pill}
                    data-tone={STATUS_TONE[t.status]}
                    data-pill="status"
                  >
                    {STATUS_LABEL[t.status]}
                  </span>
                  <span
                    className={s.pill}
                    data-tone={PRIORITY_TONE[t.priority]}
                    data-pill="priority"
                  >
                    {PRIORITY_LABEL[t.priority]}
                  </span>
                </div>
              </div>
              <p className={s.preview}>{t.description}</p>
              <div className={s.meta}>
                <span className={s.metaItem}>
                  <IconTag className={s.metaIcon} aria-hidden />
                  {CATEGORY_LABEL[t.category]}
                </span>
                <span className={s.metaItem}>
                  <IconMessage className={s.metaIcon} aria-hidden />
                  {toPersianNumber(t.messageCount)} پیام
                </span>
                {t.assignedToId ? (
                  <span className={s.metaItem} data-state="assigned">
                    <IconLock className={s.metaIcon} aria-hidden />
                    ارجاع شده
                  </span>
                ) : (
                  <span className={s.metaItem} data-state="unassigned">بدون ارجاع</span>
                )}
                <span className={s.metaItem} data-state="time">
                  {timeAgo(t.updatedAt)}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
