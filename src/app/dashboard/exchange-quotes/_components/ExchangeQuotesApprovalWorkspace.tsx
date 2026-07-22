'use client';

/**
 * ExchangeQuotesApprovalWorkspace — 2026 Market Intelligence Queue
 *
 * Redesign: از جدول ساده → Market Intelligence Dashboard
 * - KPI strip: pending / approved / rejected + اسپرد میانگین
 * - Spread delta bar (نشان می‌دهد قیمت چقدر از میانگین فاصله دارد)
 * - Status filter tabs
 * - Detail sheet با نمودار spread
 * - Approve/Reject با inline motion feedback
 */

import type { QuoteRow } from '@/actions/exchange-quotes';
import { approveQuote, rejectQuote } from '@/actions/exchange-quotes';
import { EmptyState, PageHeader } from '@/components/Dashboard/primitives';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Scale,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import s from './ExchangeQuotesApprovalWorkspace.module.css';

interface Props {
  initialPending: QuoteRow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcSpread(buy: number, sell: number): number {
  if (buy <= 0) return 0;
  return ((sell - buy) / buy) * 100;
}

function fmtRate(val: string | number): string {
  return Number(val).toLocaleString('fa-IR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso: string | Date): string {
  return new Date(iso).toLocaleString('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/** SpreadBar — نشان‌دهنده بصری اسپرد با نشانگر threshold */
function SpreadBar({ spreadPct }: { spreadPct: number }) {
  // threshold: ≤1% سبز, 1-3% زرد, >3% قرمز
  const pct = Math.min(spreadPct, 5);
  const filled = (pct / 5) * 100;
  const level = spreadPct <= 1 ? 'low' : spreadPct <= 3 ? 'mid' : 'high';

  return (
    <div className={s.spreadBarWrap} title={`اسپرد: ${spreadPct.toFixed(2)}٪`}>
      <div className={s.spreadBar}>
        <div
          className={`${s.spreadFill} ${s[`spreadFill_${level}`]}`}
          style={{ width: `${filled}%` }}
        />
        {/* threshold markers */}
        <div className={s.spreadMark} style={{ insetInlineStart: '20%' }} aria-hidden />
        <div className={s.spreadMark} style={{ insetInlineStart: '60%' }} aria-hidden />
      </div>
      <span className={`${s.spreadPct} ${s[`spreadPct_${level}`]}`}>
        {spreadPct.toFixed(2)}٪
      </span>
    </div>
  );
}

/** RateDelta — نشان می‌دهد خرید/فروش نسبت به هم چقدر جابه‌جا شده */
function RateCell({ label, val, direction }: { label: string; val: string; direction?: 'up' | 'down' }) {
  return (
    <div className={s.rateCell}>
      <span className={s.rateCellLabel}>{label}</span>
      <span className={s.rateCellVal}>
        {fmtRate(val)}
        {direction === 'up' && <TrendingUp size={12} className={s.rateTrendUp} aria-label="بالا" />}
        {direction === 'down' && <TrendingDown size={12} className={s.rateTrendDown} aria-label="پایین" />}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ExchangeQuotesApprovalWorkspace({ initialPending }: Props) {
  const [quotes, setQuotes] = useState<QuoteRow[]>(initialPending);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; ok: boolean; msg: string } | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all');

  // ── KPI calculations ──────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const avgSpread = quotes.length > 0
      ? quotes.reduce((sum, q) => sum + calcSpread(Number(q.buyRate), Number(q.sellRate)), 0) / quotes.length
      : 0;
    const highRisk = quotes.filter(q => calcSpread(Number(q.buyRate), Number(q.sellRate)) > 3).length;
    const currencies = [...new Set(quotes.map(q => q.currencyCode))];
    return { count: quotes.length, avgSpread, highRisk, currencies };
  }, [quotes]);

  // ── Currency filter ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (selectedCurrency === 'all') return quotes;
    return quotes.filter(q => q.currencyCode === selectedCurrency);
  }, [quotes, selectedCurrency]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleApprove = useCallback(async (id: string) => {
    setLoadingId(id);
    const res = await approveQuote(id);
    setLoadingId(null);
    if (res.success) {
      setQuotes(prev => prev.filter(q => q.id !== id));
      setFeedback({ id, ok: true, msg: 'تأیید شد' });
      setTimeout(() => setFeedback(null), 2500);
    } else {
      setFeedback({ id, ok: false, msg: res.error.message });
    }
  }, []);

  const handleRejectConfirm = useCallback(async () => {
    if (!rejectTargetId || !rejectReason.trim()) return;
    const id = rejectTargetId;
    setLoadingId(id);
    const res = await rejectQuote(id, rejectReason);
    setLoadingId(null);
    if (res.success) {
      setQuotes(prev => prev.filter(q => q.id !== id));
      setRejectTargetId(null);
      setRejectReason('');
    } else {
      setFeedback({ id, ok: false, msg: res.error.message });
    }
  }, [rejectTargetId, rejectReason]);

  return (
    <div className={s.root} dir="rtl">
      <PageHeader
        title="صف تأیید قیمت‌گذاری"
        description="قیمت‌های خرید/فروش ثبت‌شده توسط صرافی‌ها را بررسی و تأیید/رد کنید"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'تأیید قیمت‌ها' }]}
      />

      {/* ── KPI Strip ── */}
      <div className={s.kpiStrip}>
        <div className={s.kpiCard}>
          <div className={s.kpiIcon} data-color="amber" aria-hidden>
            <Clock size={15} />
          </div>
          <div className={s.kpiBody}>
            <span className={s.kpiVal}>{new Intl.NumberFormat('fa-IR').format(kpi.count)}</span>
            <span className={s.kpiLabel}>در صف بررسی</span>
          </div>
        </div>

        <div className={s.kpiCard}>
          <div className={s.kpiIcon} data-color="brand" aria-hidden>
            <Scale size={15} />
          </div>
          <div className={s.kpiBody}>
            <span className={s.kpiVal}>{kpi.avgSpread.toFixed(2)}٪</span>
            <span className={s.kpiLabel}>اسپرد میانگین</span>
          </div>
        </div>

        <div className={s.kpiCard}>
          <div className={s.kpiIcon} data-color={kpi.highRisk > 0 ? 'rose' : 'emerald'} aria-hidden>
            {kpi.highRisk > 0 ? <AlertTriangle size={15} /> : <ShieldCheck size={15} />}
          </div>
          <div className={s.kpiBody}>
            <span className={s.kpiVal}>{new Intl.NumberFormat('fa-IR').format(kpi.highRisk)}</span>
            <span className={s.kpiLabel}>اسپرد بالا (&gt;۳٪)</span>
          </div>
        </div>

        <div className={s.kpiCard}>
          <div className={s.kpiIcon} data-color="violet" aria-hidden>
            <TrendingUp size={15} />
          </div>
          <div className={s.kpiBody}>
            <span className={s.kpiVal}>{new Intl.NumberFormat('fa-IR').format(kpi.currencies.length)}</span>
            <span className={s.kpiLabel}>ارز متفاوت</span>
          </div>
        </div>
      </div>

      {/* ── Feedback toast ── */}
      {feedback && (
        <output className={`${s.toast} ${feedback.ok ? s.toastOk : s.toastErr}`} aria-live="polite">
          {feedback.ok ? <CheckCircle2 size={14} aria-hidden /> : <XCircle size={14} aria-hidden />}
          {feedback.msg}
        </output>
      )}

      {/* ── Currency filter ── */}
      {kpi.currencies.length > 1 && (
        <nav className={s.filterNav} role="tablist" aria-label="فیلتر ارز">
          <button
            type="button"
            role="tab"
            aria-selected={selectedCurrency === 'all'}
            className={`${s.filterBtn} ${selectedCurrency === 'all' ? s.filterBtnActive : ''}`}
            onClick={() => setSelectedCurrency('all')}
          >
            همه ارزها
          </button>
          {kpi.currencies.map(c => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={selectedCurrency === c}
              className={`${s.filterBtn} ${selectedCurrency === c ? s.filterBtnActive : ''}`}
              onClick={() => setSelectedCurrency(c)}
            >
              {c}
            </button>
          ))}
        </nav>
      )}

      {/* ── Empty state ── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="صف خالی است"
          description="همه قیمت‌ها بررسی شده‌اند. وقتی صرافی قیمت جدید ثبت کند اینجا نمایش داده می‌شود."
        />
      ) : (
        <div className={s.list}>
          {filtered.map((q) => {
            const spread = calcSpread(Number(q.buyRate), Number(q.sellRate));
            const isLoading = loadingId === q.id;
            const isRejecting = rejectTargetId === q.id;
            const thisFeedback = feedback?.id === q.id ? feedback : null;

            return (
              <article key={q.id} className={`${s.card} ${isLoading ? s.cardLoading : ''}`}>
                {/* ── Card header ── */}
                <div className={s.cardHead}>
                  <div className={s.exchangeInfo}>
                    <div className={s.exchangeAvatar} aria-hidden>
                      {(q.exchangeName ?? q.exchangeId).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong className={s.exchangeName}>{q.exchangeName ?? q.exchangeId}</strong>
                      {q.exchangeCity && <span className={s.exchangeCity}>{q.exchangeCity}</span>}
                    </div>
                  </div>

                  <div className={s.headerMeta}>
                    <span className={s.currencyBadge}>{q.currencyCode}</span>
                    <span className={s.pairBadge} dir="ltr">{q.currencyPair}</span>
                    <div className={s.timeInfo}>
                      <Clock size={11} aria-hidden />
                      {fmtDate(q.createdAt)}
                    </div>
                  </div>
                </div>

                {/* ── Rate grid ── */}
                <div className={s.rateGrid}>
                  <RateCell label="خرید" val={q.buyRate} direction="up" />
                  <div className={s.rateGridDivider} aria-hidden />
                  <RateCell label="فروش" val={q.sellRate} direction="down" />
                  <div className={s.rateGridDivider} aria-hidden />
                  <div className={s.rateCell}>
                    <span className={s.rateCellLabel}>واحد</span>
                    <span className={s.rateCellVal}>{q.unit}</span>
                  </div>
                  <div className={s.rateGridDivider} aria-hidden />
                  <div className={s.rateCell}>
                    <span className={s.rateCellLabel}>اعتبار</span>
                    <span className={s.rateCellVal}>{q.validMinutes} دقیقه</span>
                  </div>
                </div>

                {/* ── Spread indicator ── */}
                <div className={s.spreadSection}>
                  <span className={s.spreadLabel}>اسپرد بازار</span>
                  <SpreadBar spreadPct={spread} />
                </div>

                {/* ── Inline feedback ── */}
                {thisFeedback && (
                  <div className={`${s.inlineFeedback} ${thisFeedback.ok ? s.feedbackOk : s.feedbackErr}`} role="status">
                    {thisFeedback.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    {thisFeedback.msg}
                  </div>
                )}

                {/* ── Actions ── */}
                {!isRejecting ? (
                  <div className={s.cardActions}>
                    <button
                      type="button"
                      className={s.approveBtn}
                      onClick={() => handleApprove(q.id)}
                      disabled={isLoading}
                      aria-busy={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 size={14} className={s.spin} aria-hidden />
                      ) : (
                        <CheckCircle2 size={14} aria-hidden />
                      )}
                      تأیید
                    </button>
                    <button
                      type="button"
                      className={s.rejectBtn}
                      onClick={() => setRejectTargetId(q.id)}
                      disabled={isLoading}
                    >
                      <XCircle size={14} aria-hidden />
                      رد
                    </button>
                  </div>
                ) : (
                  <div className={s.rejectForm}>
                    <input
                      type="text"
                      className={s.rejectInput}
                      placeholder="دلیل رد (الزامی)…"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      // biome-ignore lint/a11y/noAutofocus: reject form is contextual — expected UX
                      autoFocus
                      aria-label="دلیل رد"
                    />
                    <div className={s.rejectActions}>
                      <button
                        type="button"
                        className={s.confirmRejectBtn}
                        disabled={!rejectReason.trim() || isLoading}
                        onClick={handleRejectConfirm}
                      >
                        {isLoading ? <Loader2 size={12} className={s.spin} aria-hidden /> : null}
                        تأیید رد
                      </button>
                      <button
                        type="button"
                        className={s.cancelRejectBtn}
                        disabled={isLoading}
                        onClick={() => { setRejectTargetId(null); setRejectReason(''); }}
                      >
                        انصراف
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
