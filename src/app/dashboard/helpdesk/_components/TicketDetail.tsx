'use client';

/**
 * TicketDetail — پنل کشویی (slide-over) برای مشاهده و پاسخ به تیکت.
 * -----------------------------------------------------------------
 *  با PanelDrawer canonical رندر می‌شود. شامل:
 *   - sticky header: subject + status pills
 *   - scrollable body: description + messages thread
 *   - sticky footer: reply form (textarea + internal checkbox + send)
 */

import { useCallback, useEffect, useState } from 'react';
import { PanelDrawer } from '@/components/Dashboard/primitives';
import { replyToTicket, updateTicketStatus } from '@/actions/tickets-actions';
import type {
  TicketMessageSummary,
  TicketStatus,
  TicketSummary,
} from '@/lib/tickets';
import s from './TicketDetail.module.css';

interface TicketDetailProps {
  ticket: TicketSummary | null;
  onClose: () => void;
  onChanged: () => void;
}

// ── minimal inline SVG icons (token-based) ─────────────────
const IconCheck = (p: { className?: string }) => (
  <svg className={p.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
const IconClock = (p: { className?: string }) => (
  <svg className={p.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconLoader = (p: { className?: string }) => (
  <svg className={p.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M12 2a10 10 0 0 1 10 10" />
  </svg>
);
const IconLock = (p: { className?: string }) => (
  <svg className={p.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconMessage = (p: { className?: string }) => (
  <svg className={p.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconSend = (p: { className?: string }) => (
  <svg className={p.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const IconSparkles = (p: { className?: string }) => (
  <svg className={p.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
    <path d="M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
  </svg>
);
const IconTag = (p: { className?: string }) => (
  <svg className={p.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20.59 13.41l-7.18 7.18a2 2 0 0 1-2.82 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <circle cx="7" cy="7" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);
const IconX = (p: { className?: string }) => (
  <svg className={p.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'باز',
  pending: 'منتظر پاسخ',
  in_progress: 'در حال بررسی',
  resolved: 'حل شده',
  closed: 'بسته',
};

const PRIORITY_LABEL: Record<TicketSummary['priority'], string> = {
  low: 'کم',
  normal: 'معمولی',
  high: 'بالا',
  urgent: 'فوری',
};

const CATEGORY_LABEL: Record<TicketSummary['category'], string> = {
  general: 'عمومی',
  billing: 'مالی',
  technical: 'فنی',
  kyc: 'احراز هویت',
  account: 'حساب کاربری',
  transfer: 'انتقال وجه',
  rate: 'نرخ ارز',
  other: 'سایر',
};

const STATUS_TONE: Record<TicketStatus, 'cyan' | 'amber' | 'indigo' | 'emerald' | 'neutral'> = {
  open: 'cyan',
  pending: 'amber',
  in_progress: 'indigo',
  resolved: 'emerald',
  closed: 'neutral',
};

const PRIORITY_TONE: Record<TicketSummary['priority'], 'rose' | 'amber' | 'indigo' | 'neutral'> = {
  urgent: 'rose',
  high: 'amber',
  normal: 'indigo',
  low: 'neutral',
};

const STATUS_FLOW: TicketStatus[] = ['open', 'pending', 'in_progress', 'resolved', 'closed'];

function toPersianNumber(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

function formatFull(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
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

export function TicketDetail({ ticket, onClose, onChanged }: TicketDetailProps) {
  const [messages, setMessages] = useState<TicketMessageSummary[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<TicketStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    if (!ticket) return;
    setLoadingMsgs(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/snapshot?ticketId=${ticket.id}`, {
        cache: 'no-store',
      });
      const json = (await res.json()) as { success: boolean; data?: TicketMessageSummary[] };
      if (json.success && json.data) setMessages(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت پیام‌ها');
    } finally {
      setLoadingMsgs(false);
    }
  }, [ticket]);

  useEffect(() => {
    if (!ticket) {
      setMessages([]);
      setReply('');
      setIsInternal(false);
      setError(null);
      return;
    }
    void loadMessages();
  }, [ticket, loadMessages]);

  const handleSend = async () => {
    if (!ticket || !reply.trim() || sending) return;
    setSending(true);
    setError(null);
    const res = await replyToTicket(ticket.id, reply, isInternal);
    setSending(false);
    if (res.success) {
      setReply('');
      setIsInternal(false);
      await loadMessages();
      onChanged();
    } else {
      setError(res.message ?? 'خطا در ارسال پاسخ');
    }
  };

  const handleStatusChange = async (next: TicketStatus) => {
    if (!ticket || statusUpdating || ticket.status === next) return;
    setStatusUpdating(next);
    setError(null);
    const res = await updateTicketStatus(ticket.id, next);
    setStatusUpdating(null);
    if (res.success) {
      onChanged();
    } else {
      setError(res.message ?? 'خطا در تغییر وضعیت');
    }
  };

  if (!ticket) return null;

  return (
    <PanelDrawer open={!!ticket} onClose={onClose} title={ticket.subject} width="min(560px, 100vw)">
      <div className={s.body}>
        <header className={s.header}>
          <div className={s.badges}>
            <span className={s.pill} data-tone={STATUS_TONE[ticket.status]}>{STATUS_LABEL[ticket.status]}</span>
            <span className={s.pill} data-tone={PRIORITY_TONE[ticket.priority]}>{PRIORITY_LABEL[ticket.priority]}</span>
            <span className={s.pillSoft}>
              <IconTag className={s.pillSoftIcon} aria-hidden />
              {CATEGORY_LABEL[ticket.category]}
            </span>
          </div>
          <dl className={s.metaGrid}>
            <div className={s.metaItem}>
              <dt><IconClock className={s.metaIcon} aria-hidden /> ایجاد</dt>
              <dd>{formatFull(ticket.createdAt)}</dd>
            </div>
            <div className={s.metaItem}>
              <dt><IconMessage className={s.metaIcon} aria-hidden /> پیام‌ها</dt>
              <dd>{toPersianNumber(ticket.messageCount)}</dd>
            </div>
            {ticket.firstResponseAt ? (
              <div className={s.metaItem}>
                <dt><IconSparkles className={s.metaIcon} aria-hidden /> اولین پاسخ</dt>
                <dd>{formatFull(ticket.firstResponseAt)}</dd>
              </div>
            ) : null}
            {ticket.resolvedAt ? (
              <div className={s.metaItem}>
                <dt><IconCheck className={s.metaIcon} aria-hidden /> حل شده</dt>
                <dd>{formatFull(ticket.resolvedAt)}</dd>
              </div>
            ) : null}
          </dl>
        </header>

        <section className={s.section}>
          <h3 className={s.sectionTitle}>شرح</h3>
          <p className={s.description}>{ticket.description}</p>
        </section>

        <section className={s.section}>
          <h3 className={s.sectionTitle}>تغییر وضعیت</h3>
          <div className={s.statusFlow} role="radiogroup" aria-label="تغییر وضعیت">
            {STATUS_FLOW.map((st) => {
              const isActive = ticket.status === st;
              const isLoading = statusUpdating === st;
              return (
                <button
                  key={st}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  disabled={!!statusUpdating}
                  onClick={() => void handleStatusChange(st)}
                  className={s.statusBtn}
                  data-active={isActive}
                  data-tone={STATUS_TONE[st]}
                >
                  {isLoading ? <IconLoader className={`${s.spin} ${s.statusIcon}`} aria-hidden /> : null}
                  <span>{STATUS_LABEL[st]}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={s.section}>
          <h3 className={s.sectionTitle}>گفتگو ({toPersianNumber(messages.length)})</h3>
          {loadingMsgs ? (
            <div className={s.loading}>
              <IconLoader className={`${s.spin} ${s.loadingIcon}`} aria-hidden /> در حال بارگذاری پیام‌ها...
            </div>
          ) : messages.length === 0 ? (
            <div className={s.empty}>هنوز پیامی ارسال نشده. اولین پاسخ را بنویسید.</div>
          ) : (
            <ol className={s.thread}>
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={s.message}
                  data-internal={m.isInternal}
                  data-author={m.authorRole ?? 'user'}
                >
                  <div className={s.messageMeta}>
                    <span className={s.messageAuthor}>
                      {m.isInternal ? <IconLock className={s.lockIcon} aria-hidden /> : null}
                      {m.authorRole ?? 'کاربر'} · {timeAgo(m.createdAt)}
                    </span>
                    {m.isInternal ? (
                      <span className={s.internalBadge}>یادداشت داخلی</span>
                    ) : null}
                  </div>
                  <p className={s.messageBody}>{m.body}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        {error ? (
          <div className={s.error} role="alert">
            <IconX className={s.errorIcon} aria-hidden />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      <div className={s.footer}>
        <label className={s.internalLabel}>
          <input
            type="checkbox"
            checked={isInternal}
            onChange={(e) => setIsInternal(e.target.checked)}
          />
          <span>یادداشت داخلی (فقط تیم)</span>
        </label>
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || !reply.trim()}
          className={s.sendBtn}
        >
          {sending ? <IconLoader className={`${s.spin} ${s.sendIcon}`} aria-hidden /> : <IconSend className={s.sendIcon} aria-hidden />}
          ارسال پاسخ
        </button>
      </div>

      {/* textarea بیرون از footer برای کنترل layout */}
      <div className={s.replyWrap}>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="پاسخ خود را بنویسید..."
          rows={4}
          maxLength={5000}
          dir="rtl"
          className={s.replyInput}
        />
        <div className={s.replyCount}>{toPersianNumber(reply.length)} / ۵۰۰۰</div>
      </div>
    </PanelDrawer>
  );
}
