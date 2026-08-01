'use client';

/**
 * QuoteCard — کارت quote برای نمای شبکه‌ای (موبایل / تبلت).
 *
 * نمایش جمع‌وربسته: کد ارز + نام، خرید/فروش با عدد فارسی، اسپرد،
 * وضعیت و countdown. کلیک → کادر وضعیت quote (در QuotesWorkspace).
 */

import type { QuoteRow } from '@/actions/exchange-quotes';
import {
  QUOTE_STATUS_FA,
  countdownLabel,
  formatDateTime,
  quoteNumber,
  spreadPct,
} from '@/lib/exchange-quotes-labels';
import { Clock, History } from 'lucide-react';
import s from './QuotesWorkspace.module.css';

interface Props {
  quote: QuoteRow;
  nowMs: number;
  onSelect: (id: string) => void;
}

export function QuoteCard({ quote, nowMs, onSelect }: Props) {
  const st = QUOTE_STATUS_FA[quote.status] ?? { label: quote.status, tone: 'muted' as const };
  const active = quote.status === 'ACTIVE';

  return (
    <button type="button" className={s.card} onClick={() => onSelect(quote.id)}>
      {/* سربرگ کارت */}
      <div className={s.cardHead}>
        <span className={s.cardCode} dir="ltr">
          {quote.currencyCode}
        </span>
        <span className={s.cardPair} dir="ltr">
          {quote.currencyPair}
        </span>
        <output className={s.statusPill} data-tone={st.tone}>
          {active && <span className={s.liveDot} aria-hidden />}
          {st.label}
        </output>
      </div>

      {/* نرخ‌ها */}
      <div className={s.cardRates}>
        <div className={s.cardRate}>
          <span className={s.cardRateLabel}>خرید</span>
          <span className={s.cardRateValue} dir="ltr">
            {quoteNumber(quote.buyRate)}
          </span>
        </div>
        <div className={s.cardRateDivider} aria-hidden />
        <div className={s.cardRate}>
          <span className={s.cardRateLabel}>فروش</span>
          <span className={s.cardRateValue} dir="ltr">
            {quoteNumber(quote.sellRate)}
          </span>
        </div>
      </div>

      {/* پایین کارت */}
      <div className={s.cardFoot}>
        <span className={s.cardSpread}>اسپرد {spreadPct(quote.buyRate, quote.sellRate)}</span>
        {active && quote.expiresAt ? (
          <span className={s.cardCountdown}>
            <Clock size={12} aria-hidden />
            {countdownLabel(quote.expiresAt, nowMs)}
          </span>
        ) : (
          <span className={s.cardUpdated}>
            <History size={12} aria-hidden />
            {formatDateTime(quote.updatedAt)}
          </span>
        )}
      </div>
    </button>
  );
}
