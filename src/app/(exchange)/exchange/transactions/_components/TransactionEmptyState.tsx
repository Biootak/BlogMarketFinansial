/**
 * TransactionEmptyState — حالت خالی با illustration اختصاصی.
 *
 * الگو: SVG inline با system-breath (نه Lottie، نه emoji).
 * دکمه CTA که به ثبت تراکنش جدید لینک می‌شود (اگر canAdd).
 */

'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import s from './TransactionEmptyState.module.css';

export function TransactionEmptyState({
  canAdd,
  onAddClick,
  hasFilter,
  onClearFilter,
}: {
  canAdd: boolean;
  onAddClick: () => void;
  hasFilter: boolean;
  onClearFilter: () => void;
}) {
  return (
    <div className={s.root} role="status" aria-live="polite">
      {/* ── Illustration: system-breath geometric ─────────────────────── */}
      <div className={s.illo} aria-hidden>
        <svg viewBox="0 0 200 160" width="100%" height="100%">
          <defs>
            <radialGradient id="tx-empty-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* halo */}
          <circle cx="100" cy="80" r="60" fill="url(#tx-empty-grad)" />
          {/* concentric rings */}
          <g className={s.ring}>
            <circle
              cx="100"
              cy="80"
              r="50"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.7"
              opacity="0.5"
            />
            <circle
              cx="100"
              cy="80"
              r="38"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              opacity="0.35"
            />
            <circle
              cx="100"
              cy="80"
              r="26"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.25"
            />
          </g>
          {/* center mark — small geometric receipt */}
          <g className={s.mark}>
            <rect
              x="86"
              y="64"
              width="28"
              height="36"
              rx="3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              opacity="0.85"
            />
            <line
              x1="92"
              y1="74"
              x2="108"
              y2="74"
              stroke="currentColor"
              strokeWidth="1.1"
              opacity="0.7"
            />
            <line
              x1="92"
              y1="80"
              x2="108"
              y2="80"
              stroke="currentColor"
              strokeWidth="1.1"
              opacity="0.5"
            />
            <line
              x1="92"
              y1="86"
              x2="108"
              y2="86"
              stroke="currentColor"
              strokeWidth="1.1"
              opacity="0.35"
            />
            <line
              x1="92"
              y1="92"
              x2="100"
              y2="92"
              stroke="currentColor"
              strokeWidth="1.1"
              opacity="0.3"
            />
          </g>
        </svg>
      </div>

      <div className={s.text}>
        <h3 className={s.title}>
          {hasFilter ? 'تراکنشی با این فیلتر یافت نشد' : 'هنوز تراکنشی ثبت نشده'}
        </h3>
        <p className={s.description}>
          {hasFilter
            ? 'فیلتر فعلی نتیجه‌ای ندارد. فیلتر را تغییر دهید یا پاک کنید تا همه تراکنش‌ها نمایش داده شوند.'
            : 'اولین تراکنش صرافی را ثبت کنید. دفتر کل از همینجا شروع می‌شود.'}
        </p>
      </div>

      <div className={s.actions}>
        {hasFilter ? (
          <Button variant="outline" onClick={onClearFilter}>
            پاک کردن فیلتر
          </Button>
        ) : canAdd ? (
          <Button onClick={onAddClick}>
            <Plus size={14} strokeWidth={2.2} aria-hidden />
            ثبت اولین تراکنش
          </Button>
        ) : null}
      </div>
    </div>
  );
}
