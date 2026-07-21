'use client';

/**
 * ExchangeQuotesApprovalWorkspace — صف تایید قیمت‌های صرافی‌ها
 * ادمین quote های PENDING را می‌بیند، اختلاف با بازار را می‌بیند،
 * تایید یا رد می‌کند.
 */

import type { QuoteRow } from '@/actions/exchange-quotes';
import { approveQuote, rejectQuote } from '@/actions/exchange-quotes';
import { EmptyState, PageHeader } from '@/components/Dashboard/primitives';
import { CheckCircle2, Clock, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { useState } from 'react';
import s from './ExchangeQuotesApprovalWorkspace.module.css';

interface Props {
  initialPending: QuoteRow[];
}

export default function ExchangeQuotesApprovalWorkspace({ initialPending }: Props) {
  const [quotes, setQuotes] = useState<QuoteRow[]>(initialPending);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  // per-item loading state — avoid disabling all buttons when one is processing
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  async function handleApprove(id: string) {
    setLoadingId(id);
    const res = await approveQuote(id);
    setLoadingId(null);
    if (res.success) {
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      setFeedback({ id, ok: true, msg: 'تایید شد' });
      setTimeout(() => setFeedback(null), 2500);
    } else {
      setFeedback({ id, ok: false, msg: res.error.message });
    }
  }

  async function handleRejectConfirm() {
    if (!rejectTargetId || !rejectReason.trim()) return;
    const id = rejectTargetId;
    setLoadingId(id);
    const res = await rejectQuote(id, rejectReason);
    setLoadingId(null);
    if (res.success) {
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      setRejectTargetId(null);
      setRejectReason('');
    } else {
      setFeedback({ id, ok: false, msg: res.error.message });
    }
  }

  return (
    <div className={s.root}>
      <PageHeader
        title="تایید قیمت‌گذاری صرافی‌ها"
        description="قیمت‌های خرید/فروش ثبت‌شده توسط صرافی‌ها را بررسی و تایید/رد کنید"
        breadcrumb={[{ label: 'داشبورد' }, { label: 'تایید قیمت‌ها' }]}
      />

      {feedback && (
        <output className={`${s.toast} ${feedback.ok ? s.toastOk : s.toastErr}`}>
          {feedback.ok ? (
            <CheckCircle2 className="w-4 h-4" aria-hidden />
          ) : (
            <XCircle className="w-4 h-4" aria-hidden />
          )}
          {feedback.msg}
        </output>
      )}

      {quotes.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="صف خالی است"
          description="همه قیمت‌ها بررسی شده‌اند. وقتی صرافی قیمت جدید ثبت کند اینجا نمایش داده می‌شود."
        />
      ) : (
        <div className={s.list}>
          {quotes.map((q) => (
            <div key={q.id} className={s.card}>
              {/* هدر کارت */}
              <div className={s.cardHead}>
                <div className={s.exchangeInfo}>
                  <strong className={s.exchangeName}>{q.exchangeName ?? q.exchangeId}</strong>
                  {q.exchangeCity && <span className={s.exchangeCity}>{q.exchangeCity}</span>}
                </div>
                <div className={s.timeInfo}>
                  <Clock className="w-3 h-3" aria-hidden />
                  {new Date(q.createdAt).toLocaleString('fa-IR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </div>
              </div>

              {/* بدنه */}
              <div className={s.cardBody}>
                <div className={s.currencyBadge}>
                  {q.currencyCode} <span className={s.pairLabel}>{q.currencyPair}</span>
                </div>

                <div className={s.rates}>
                  <div className={s.rateItem}>
                    <span className={s.rateLabel}>خرید</span>
                    <span className={s.rateVal} dir="ltr">
                      {Number(q.buyRate).toLocaleString('fa-IR')}
                    </span>
                    <span className={s.rateUnit}>{q.unit}</span>
                  </div>
                  <div className={s.ratesSep} />
                  <div className={s.rateItem}>
                    <span className={s.rateLabel}>فروش</span>
                    <span className={s.rateVal} dir="ltr">
                      {Number(q.sellRate).toLocaleString('fa-IR')}
                    </span>
                    <span className={s.rateUnit}>{q.unit}</span>
                  </div>
                  <div className={s.ratesSep} />
                  <div className={s.rateItem}>
                    <span className={s.rateLabel}>اسپرد</span>
                    <span className={s.rateVal} dir="ltr">
                      {(
                        ((Number(q.sellRate) - Number(q.buyRate)) / Number(q.buyRate)) *
                        100
                      ).toFixed(2)}
                      ٪
                    </span>
                  </div>
                  <div className={s.rateItem}>
                    <span className={s.rateLabel}>اعتبار</span>
                    <span className={s.rateVal}>{q.validMinutes} دقیقه</span>
                  </div>
                </div>
              </div>

              {/* دکمه‌ها */}
              {rejectTargetId === q.id ? (
                <div className={s.rejectForm}>
                  <input
                    type="text"
                    className={s.rejectInput}
                    placeholder="دلیل رد (الزامی)…"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    // biome-ignore lint/a11y/noAutofocus: filter input is the primary action in this workspace — expected UX
                    autoFocus
                    aria-label="دلیل رد"
                  />
                  <div className={s.rejectActions}>
                    <button
                      type="button"
                      className={s.confirmRejectBtn}
                      disabled={!rejectReason.trim() || loadingId === q.id}
                      onClick={handleRejectConfirm}
                    >
                      {loadingId === q.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
                      ) : null}
                      تایید رد
                    </button>
                    <button
                      type="button"
                      className={s.cancelBtn}
                      disabled={loadingId === q.id}
                      onClick={() => {
                        setRejectTargetId(null);
                        setRejectReason('');
                      }}
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              ) : (
                <div className={s.cardActions}>
                  <button
                    type="button"
                    className={s.approveBtn}
                    onClick={() => handleApprove(q.id)}
                    disabled={loadingId === q.id}
                    aria-busy={loadingId === q.id}
                  >
                    {loadingId === q.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" aria-hidden />
                    )}
                    تایید
                  </button>
                  <button
                    type="button"
                    className={s.rejectBtn}
                    onClick={() => setRejectTargetId(q.id)}
                    disabled={loadingId === q.id}
                  >
                    <XCircle className="w-4 h-4" aria-hidden />
                    رد
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
