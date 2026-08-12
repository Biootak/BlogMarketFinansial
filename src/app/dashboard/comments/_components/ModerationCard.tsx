'use client';

/**
 * ModerationCard — کارت مدیریت نظر (2026)
 *
 * دکمه‌ها بر اساس status نظر:
 *   pending  → تأیید + رد
 *   approved → لغو تأیید
 *   rejected → تأیید + بازگشت به انتظار
 *   همه      → حذف
 */

import type { CommentRow } from '@/actions/comments-actions';
import { ArrowUpRight, CheckCheck, FileText, MessageSquare, RotateCcw, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import s from './ModerationCard.module.css';

interface ModerationCardProps {
  comment: CommentRow;
  onApprove: (id: string) => void;
  /** pending → رد (confirm dialog) */
  onRejectRequest: (id: string) => void;
  /** approved → لغو تأیید (مستقیم) */
  onUnapprove: (id: string) => void;
  /** rejected → برگشت به pending (مستقیم) */
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

const fa = new Intl.NumberFormat('fa-IR');
const EXPAND_THRESHOLD = 120;

const STATUS_LABEL: Record<'pending' | 'approved' | 'rejected', string> = {
  pending: 'در انتظار',
  approved: 'تأییدشده',
  rejected: 'ردشده',
};

export function ModerationCard({
  comment,
  onApprove,
  onRejectRequest,
  onUnapprove,
  onRestore,
  onDelete,
}: ModerationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const needsExpand = comment.content.length > EXPAND_THRESHOLD;
  const status = comment.status;

  return (
    <div
      className={`${s.card} ${s[status]}`}
      data-status={status}
    >
      {/* ── Header: Author + Status ── */}
      <div className={s.header}>
        <div className={s.author}>
          <div className={s.avatar} aria-hidden>
            {comment.authorName.charAt(0)}
          </div>
          <div className={s.authorInfo}>
            <span className={s.authorName}>{comment.authorName}</span>
            <span className={s.authorEmail} title={comment.authorEmail}>
              {comment.authorEmail}
            </span>
          </div>
        </div>
        <div className={s.meta}>
          <span
            className={`${s.statusPill} ${s[status]}`}
            data-status={status}
          >
            <span className={s.statusDot} />
            {STATUS_LABEL[status]}
          </span>
          <span className={s.time}>{comment.time}</span>
        </div>
      </div>

      {/* ── Post Context ── */}
      <Link
        href={`/dashboard/posts/edit/${comment.postId}`}
        className={s.postLink}
        target="_blank"
        title={comment.postTitle}
      >
        <FileText size={13} strokeWidth={1.5} className={s.postLinkIcon} />
        <span>{comment.postTitle}</span>
        <ArrowUpRight size={12} strokeWidth={1.5} className={s.postLinkArrow} />
      </Link>

      {/* ── Content ── */}
      <div className={s.content}>
        <p className={`${s.text} ${needsExpand ? (expanded ? s.expanded : s.collapsed) : ''}`}>
          {comment.content}
        </p>
        {needsExpand && (
          <button type="button" className={s.expandBtn} onClick={() => setExpanded((e) => !e)}>
            {expanded ? 'بستن' : 'ادامه مطلب'}
          </button>
        )}
        {comment.replyCount > 0 && (
          <span className={s.replyBadge}>
            <MessageSquare size={12} strokeWidth={1.5} />
            <span>{fa.format(comment.replyCount)} پاسخ</span>
          </span>
        )}
      </div>

      {/* ── Footer: Actions ── */}
      <div className={s.footer}>
        <div className={s.footerLeft}>
          {/* pending: تأیید + رد */}
          {status === 'pending' && (
            <>
              <button
                type="button"
                className={`${s.actionBtn} ${s.approve}`}
                onClick={() => onApprove(comment.id)}
                title="تأیید نظر"
              >
                <CheckCheck size={14} strokeWidth={1.75} />
                <span className={s.actionLabel}>تأیید</span>
              </button>
              <button
                type="button"
                className={`${s.actionBtn} ${s.reject}`}
                onClick={() => onRejectRequest(comment.id)}
                title="رد نظر"
              >
                <X size={14} strokeWidth={1.75} />
                <span className={s.actionLabel}>رد</span>
              </button>
            </>
          )}

          {/* approved: لغو تأیید */}
          {status === 'approved' && (
            <button
              type="button"
              className={`${s.actionBtn} ${s.reject}`}
              onClick={() => onUnapprove(comment.id)}
              title="لغو تأیید — برگشت به انتظار"
            >
              <X size={14} strokeWidth={1.75} />
              <span className={s.actionLabel}>لغو تأیید</span>
            </button>
          )}

          {/* rejected: تأیید + برگشت به انتظار */}
          {status === 'rejected' && (
            <>
              <button
                type="button"
                className={`${s.actionBtn} ${s.approve}`}
                onClick={() => onApprove(comment.id)}
                title="تأیید نظر"
              >
                <CheckCheck size={14} strokeWidth={1.75} />
                <span className={s.actionLabel}>تأیید</span>
              </button>
              <button
                type="button"
                className={`${s.actionBtn} ${s.restore}`}
                onClick={() => onRestore(comment.id)}
                title="برگشت به صف انتظار"
              >
                <RotateCcw size={14} strokeWidth={1.75} />
                <span className={s.actionLabel}>بازگشت</span>
              </button>
            </>
          )}
        </div>

        <div className={s.actions}>
          <button
            type="button"
            className={`${s.actionBtn} ${s.delete}`}
            onClick={() => onDelete(comment.id)}
            title="حذف نظر"
          >
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}
