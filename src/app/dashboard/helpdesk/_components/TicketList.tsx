'use client';

/**
 * TicketList — فهرست تیکت‌ها با چیدمان Premium Glass.
 * -----------------------------------------------------------------
 *  هر ردیف: آواتار گرادیانی (حرف اول subject) + subject + preview +
 *  meta (دسته، پیام‌ها، ارجاع، SLA) + badges.
 *  hover: lift + shadow. selected: accent ring.
 */

import type { TicketCategory, TicketPriority, TicketStatus, TicketSummary } from '@/lib/tickets';
import { cn } from '@/lib/utils';
import s from './TicketList.module.css';

interface TicketListProps {
  tickets: TicketSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyHint?: string;
}

/** SLA target per priority (hours) — هماهنگ با فرم تیکت جدید */
const SLA_HOURS: Record<TicketPriority, number> = {
  urgent: 2,
  high: 8,
  normal: 24,
  low: 48,
};

// ── minimal inline SVG icons (token-based) ──────────────────────
const IconTag = (props: { className?: string }) => (
  <svg
    className={props.className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M20.59 13.41l-7.18 7.18a2 2 0 0 1-2.82 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <circle cx="7" cy="7" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);
const IconMessage = (props: { className?: string }) => (
  <svg
    className={props.className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconUser = (props: { className?: string }) => (
  <svg
    className={props.className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
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

/** گرادیان آواتار پایدار بر اساس id (۴ حالت) */
const AVATAR_GRADIENTS = ['av1', 'av2', 'av3', 'av4'] as const;
function avatarTone(id: string): (typeof AVATAR_GRADIENTS)[number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '—';
  const diff = Date.now() - d;
  if (diff < 60_000) return 'لحظاتی پیش';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} دقیقه پیش`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ساعت پیش`;
  return `${Math.floor(diff / 86_400_000)} روز پیش`;
}

/**
 * زمان باقی‌مانده تا SLA برای تیکت‌های بدون پاسخ.
 * خروجی null یعنی خارج از بازه / پاسخ داده شده.
 */
function slaRemaining(t: TicketSummary): { text: string; urgent: boolean } | null {
  if (t.status === 'resolved' || t.status === 'closed') return null;
  if (t.firstResponseAt) return null;
  const target = SLA_HOURS[t.priority] * 3_600_000;
  const age = Date.now() - new Date(t.createdAt).getTime();
  if (!Number.isFinite(age)) return null;
  const remain = target - age;
  if (remain <= 0) return { text: 'SLA گذشته', urgent: true };
  const mins = Math.floor(remain / 60_000);
  if (mins < 60) return { text: `${toPersianNumber(mins)} دقیقه مانده به SLA`, urgent: mins < 90 };
  const hours = Math.floor(mins / 60);
  return {
    text: `${toPersianNumber(hours)} ساعت مانده به SLA`,
    urgent: hours <= Math.max(1, SLA_HOURS[t.priority] / 4),
  };
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
    <ol className={s.list}>
      {tickets.map((t) => {
        const isActive = t.id === selectedId;
        const sla = slaRemaining(t);
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
            aria-label={t.subject}
          >
            <span className={s.indicator} data-priority={t.priority} aria-hidden />
            <span className={cn(s.avatar, s[`avatar-${avatarTone(t.id)}`])} aria-hidden>
              {t.subject.trim().charAt(0) || '؟'}
            </span>
            <div className={s.body}>
              <div className={s.head}>
                <h3 className={s.subject}>{t.subject}</h3>
                <div className={s.badges}>
                  <span className={s.pill} data-tone={STATUS_TONE[t.status]} data-pill="status">
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
                    <IconUser className={s.metaIcon} aria-hidden />
                    ارجاع شده
                  </span>
                ) : (
                  <span className={s.metaItem} data-state="unassigned">
                    بدون ارجاع
                  </span>
                )}
                {sla ? (
                  <span className={s.metaItem} data-state={sla.urgent ? 'sla-urgent' : 'sla'}>
                    <IconClock aria-hidden />
                    {sla.text}
                  </span>
                ) : null}
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

const IconClock = (props: { className?: string }) => (
  <svg
    className={props.className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
