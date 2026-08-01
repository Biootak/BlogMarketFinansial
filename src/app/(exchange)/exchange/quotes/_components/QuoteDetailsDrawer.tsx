'use client';

/**
 * QuoteDetailsDrawer — جزئیات و تاریخچهٔ وضعیت یک quote (PanelDrawer).
 *
 * فقط داده واقعی:
 *  - مشخصات quote از ردیف DB (نرخ، واحد، بازه، اعتبار، نسخه، زمان‌ها)
 *  - timeline وضعیت از جدول audit واقعی quoteStatusLog
 * هیچ mock/نمایشی نیست — همه از دیتابیس.
 */

import type { QuoteRow } from '@/actions/exchange-quotes';
import { getQuoteStatusLogs } from '@/actions/exchange-quotes';
import { FormField, PanelDrawer } from '@/components/Dashboard/primitives';
import {
  QUOTE_STATUS_FA,
  countdownLabel,
  formatDateTime,
  quoteNumber,
  spreadPct,
} from '@/lib/exchange-quotes-labels';
import { ArrowDownLeft, ArrowUpRight, History, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import s from './QuotesWorkspace.module.css';

interface Props {
  quote: QuoteRow | null;
  exchangeId: string;
  onClose: () => void;
}

interface LogEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorRole: string | null;
  reason: string | null;
  createdAt: Date;
}

const ROLE_FA: Record<string, string> = {
  ADMIN: 'ادمین',
  SARAFI: 'صراف',
  SYSTEM: 'سیستم',
};

export function QuoteDetailsDrawer({ quote, exchangeId, onClose }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  useEffect(() => {
    if (!quote) return;
    let cancelled = false;
    setLoading(true);
    setLogError(null);
    getQuoteStatusLogs(exchangeId, quote.id).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success) {
        setLogs(res.data);
      } else {
        setLogError(res.error.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [quote, exchangeId]);

  if (!quote) return null;
  const st = QUOTE_STATUS_FA[quote.status] ?? { label: quote.status, tone: 'muted' as const };
  const active = quote.status === 'ACTIVE';

  return (
    <PanelDrawer
      open={!!quote}
      title={`${quote.currencyCode} — ${quote.currencyPair}`}
      onClose={onClose}
      width="min(480px, 100%)"
    >
      <div className={s.detailBody}>
        {/* سربرگ جزئیات */}
        <div className={s.detailHero}>
          <div className={s.detailHeroMain}>
            <span className={s.detailCode} dir="ltr">
              {quote.currencyCode}
            </span>
            <output className={s.statusPill} data-tone={st.tone}>
              {active && <span className={s.liveDot} aria-hidden />}
              {st.label}
            </output>
          </div>
          <div className={s.detailRateRow}>
            <div className={s.detailRate}>
              <span className={s.cardRateLabel}>خرید</span>
              <span className={s.detailRateValue} dir="ltr">
                {quoteNumber(quote.buyRate)}
              </span>
            </div>
            <div className={s.cardRateDivider} aria-hidden />
            <div className={s.detailRate}>
              <span className={s.cardRateLabel}>فروش</span>
              <span className={s.detailRateValue} dir="ltr">
                {quoteNumber(quote.sellRate)}
              </span>
            </div>
            <span className={s.detailSpread}>اسپرد {spreadPct(quote.buyRate, quote.sellRate)}</span>
          </div>
        </div>

        {/* مشخصات quote */}
        <div className={s.detailSection}>
          <div className={s.detailSectionHead}>
            <span className={s.detailSectionTitle}>مشخصات quote</span>
          </div>
          <div className={s.detailGrid}>
            <FormField label="جفت ارز">
              <div className={s.detailValue} dir="ltr">
                {quote.currencyPair}
              </div>
            </FormField>
            <FormField label="واحد نرخ">
              <div className={s.detailValue}>{quote.unit}</div>
            </FormField>
            <FormField label="حداقل مبلغ">
              <div className={s.detailValue} dir="ltr">
                {quote.minAmount ? quoteNumber(quote.minAmount) : '—'}
              </div>
            </FormField>
            <FormField label="حداکثر مبلغ">
              <div className={s.detailValue} dir="ltr">
                {quote.maxAmount ? quoteNumber(quote.maxAmount) : 'بدون محدودیت'}
              </div>
            </FormField>
            <FormField label="مدت اعتبار">
              <div className={s.detailValue}>
                {quote.validMinutes} دقیقه
                {active && quote.expiresAt && (
                  <span className={s.detailCountdown}>
                    ({countdownLabel(quote.expiresAt, Date.now())})
                  </span>
                )}
              </div>
            </FormField>
            <FormField label="نسخه">
              <div className={s.detailValue} dir="ltr">
                v{quote.version}
              </div>
            </FormField>
            <FormField label="زمان ثبت">
              <div className={s.detailValue}>{formatDateTime(quote.createdAt)}</div>
            </FormField>
            <FormField label="آخرین تغییر">
              <div className={s.detailValue}>{formatDateTime(quote.updatedAt)}</div>
            </FormField>
            {quote.approvedAt && (
              <FormField label="زمان تایید">
                <div className={s.detailValue}>{formatDateTime(quote.approvedAt)}</div>
              </FormField>
            )}
          </div>
        </div>

        {/* پیام ادمین */}
        {quote.note ? (
          <div className={s.detailNote}>
            <span className={s.detailNoteLabel}>پیام ادمین</span>
            <p className={s.detailNoteText}>{quote.note}</p>
          </div>
        ) : null}

        {/* تاریخچهٔ وضعیت (audit trail واقعی) */}
        <div className={s.detailSection}>
          <div className={s.detailSectionHead}>
            <span className={s.detailSectionTitle}>
              <History size={13} aria-hidden />
              تاریخچهٔ وضعیت
            </span>
            {loading && <Loader2 size={14} className={s.spin} aria-hidden />}
          </div>

          {logError ? (
            <p className={s.detailLogError} role="alert">
              {logError}
            </p>
          ) : logs.length === 0 && !loading ? (
            <p className={s.detailLogEmpty}>تاریخچه‌ای ثبت نشده است.</p>
          ) : (
            <ol className={s.timeline}>
              {logs.map((log, i) => {
                const from = log.fromStatus
                  ? (QUOTE_STATUS_FA[log.fromStatus]?.label ?? log.fromStatus)
                  : null;
                const to = QUOTE_STATUS_FA[log.toStatus]?.label ?? log.toStatus;
                const tone = QUOTE_STATUS_FA[log.toStatus]?.tone ?? 'muted';
                const isFirst = i === 0;
                return (
                  <li key={log.id} className={s.timelineItem}>
                    <span
                      className={s.timelineDot}
                      data-tone={tone}
                      data-first={isFirst}
                      aria-hidden
                    />
                    <div className={s.timelineBody}>
                      <div className={s.timelineHead}>
                        <span className={s.timelineTitle}>
                          {from ? (
                            <>
                              <ArrowDownLeft size={12} aria-hidden />
                              {from}
                              <ArrowUpRight size={12} aria-hidden />
                            </>
                          ) : (
                            <span className={s.timelineStart}>شروع</span>
                          )}
                          {to}
                        </span>
                        <span className={s.timelineMeta}>{formatDateTime(log.createdAt)}</span>
                      </div>
                      {(log.reason || log.actorRole) && (
                        <div className={s.timelineSub}>
                          {log.actorRole && (
                            <span className={s.timelineActor}>
                              توسط: {ROLE_FA[log.actorRole] ?? log.actorRole}
                            </span>
                          )}
                          {log.reason && <span className={s.timelineReason}>— {log.reason}</span>}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </PanelDrawer>
  );
}
