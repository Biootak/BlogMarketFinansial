'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { Download, X, CheckCircle2, Info, Clock, Receipt } from 'lucide-react';
import { requestDeposit, type DepositResult } from '@/actions/fintech-account';
import s from '../WalletClient.module.css';

interface DepositModalProps {
  onClose: () => void;
  currency: string;
}

// ─── Constants — برای consistency بصری ──────────────────────────────────────────

/** حداقل مبلغ واریز (100 AFN = 10000 cents) */
const MIN_DEPOSIT_CENTS = 100_00;
/** حداکثر مبلغ در یک درخواست (10M AFN = 1,000,000,000 cents) — کنترل ریسک */
const MAX_DEPOSIT_CENTS = 10_000_000_00;
/** کارمزد پلتفرم برای واریز — 0.5% */
const DEPOSIT_FEE_BPS = 50; // basis points
/** تخمین زمان پردازش (ساعت) */
const ESTIMATED_PROCESSING_HOURS = 24;

function fmtAFN(amount: number): string {
  if (Number.isNaN(amount) || amount < 0) return '—';
  return new Intl.NumberFormat('fa-AF', {
    style: 'currency',
    currency: 'AFN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function fmtInt(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

export function DepositModal({ onClose, currency }: DepositModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [result, setResult] = useState<DepositResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startT] = useTransition();

  // ─── Derived: fee + net + validation ─────────────────────────────────────────
  const feeCents = useMemo(
    () => Math.round((amountCents * DEPOSIT_FEE_BPS) / 10_000),
    [amountCents],
  );
  const netCents = useMemo(() => amountCents - feeCents, [amountCents, feeCents]);

  const validation = useMemo(() => {
    if (amountCents <= 0) return null;
    if (amountCents < MIN_DEPOSIT_CENTS) {
      return {
        type: 'error' as const,
        message: `حداقل مبلغ واریز ${fmtAFN(MIN_DEPOSIT_CENTS)} است`,
      };
    }
    if (amountCents > MAX_DEPOSIT_CENTS) {
      return {
        type: 'error' as const,
        message: `حداکثر مبلغ مجاز ${fmtAFN(MAX_DEPOSIT_CENTS)} در یک درخواست`,
      };
    }
    return null;
  }, [amountCents]);

  const handleRequest = useCallback(() => {
    if (amountCents <= 0) {
      setError('مبلغ را وارد کنید');
      return;
    }
    if (validation?.type === 'error') {
      setError(validation.message);
      return;
    }
    setError(null);
    startT(async () => {
      const res = await requestDeposit({
        amountCents,
        currency,
        idempotencyKey: crypto.randomUUID().replace(/-/g, ''),
      });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setResult(res.data);
      setStep(2);
    });
  }, [amountCents, currency, validation]);

  const QUICK = [500_00, 1000_00, 5000_00, 10000_00];

  return (
    <dialog
      className={s.modalOverlay}
      aria-label="واریز وجه"
      open
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className={s.modal}>
        <div className={s.modalHead}>
          <div className={s.modalTitle}>
            <Download size={18} aria-hidden style={{ color: 'var(--ds-status-success-fg)' }} />
            واریز وجه
          </div>
          <button type="button" className={s.modalClose} onClick={onClose} aria-label="بستن">
            <X size={16} />
          </button>
        </div>

        {step === 1 && (
          <div className={s.modalBody}>
            <p className={s.modalHint}>
              مبلغ واریزی را وارد کنید. پس از تأیید، دستورالعمل پرداخت نمایش داده می‌شود.
            </p>
            {error && (
              <div className={s.inlineError} role="alert">
                {error}
              </div>
            )}
            <div className={s.fieldGroup}>
              <label htmlFor="dep-amount" className={s.fieldLabel}>
                مبلغ (افغانی)
              </label>
              <input
                id="dep-amount"
                type="text"
                inputMode="decimal"
                className={s.fieldInput}
                dir="ltr"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setAmountCents(Math.round(Number(e.target.value.replace(/[^0-9.]/g, '')) * 100));
                  setError(null);
                }}
                placeholder="مثلاً ۵۰۰۰"
                aria-invalid={validation?.type === 'error' || undefined}
                aria-describedby={amountCents > 0 ? 'dep-amount-hint' : undefined}
              />
              {amountCents > 0 && !validation && (
                <p id="dep-amount-hint" className={s.fieldHint}>
                  {fmtAFN(amountCents)}
                </p>
              )}
              {validation?.type === 'error' && (
                <p id="dep-amount-hint" className={s.fieldErrorHint} role="alert">
                  {validation.message}
                </p>
              )}
            </div>
            <div className={s.quickBtns}>
              {QUICK.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${s.quickBtn} ${amountCents === c ? s.quickBtnActive : ''}`}
                  onClick={() => {
                    setAmountCents(c);
                    setAmount(String(c / 100));
                    setError(null);
                  }}
                >
                  {fmtAFN(c)}
                </button>
              ))}
            </div>

            {/* ── Fee Breakdown — زنده و شیشه‌ای ──────────────────────────────── */}
            {amountCents > 0 && !validation && (
              <div className={s.feeBreakdown} role="region" aria-label="جزئیات کارمزد">
                <div className={s.feeBreakdownHead}>
                  <Receipt size={13} aria-hidden />
                  <span>جزئیات تراکنش</span>
                </div>
                <div className={s.feeRow}>
                  <span className={s.feeLabel}>مبلغ واریز</span>
                  <span className={s.feeValue}>{fmtAFN(amountCents)}</span>
                </div>
                <div className={s.feeRow}>
                  <span className={s.feeLabel}>
                    کارمزد پلتفرم{' '}
                    <span className={s.feeBps}>{(DEPOSIT_FEE_BPS / 100).toFixed(2)}٪</span>
                  </span>
                  <span className={s.feeValue} dir="ltr">
                    −{fmtInt(feeCents / 100)}
                  </span>
                </div>
                <div className={`${s.feeRow} ${s.feeRowTotal}`}>
                  <span className={s.feeLabelTotal}>مبلغ قابل واریز به حساب</span>
                  <span className={s.feeValueTotal}>{fmtAFN(netCents)}</span>
                </div>
                <div className={s.feeEta}>
                  <Clock size={11} aria-hidden />
                  <span>
                    زمان تقریبی پردازش: تا {fmtInt(ESTIMATED_PROCESSING_HOURS)} ساعت کاری
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              className={s.primaryBtn}
              onClick={handleRequest}
              disabled={isPending || amountCents <= 0 || !!validation}
            >
              {isPending ? 'در حال ثبت...' : 'ادامه و دریافت شماره حساب'}
            </button>
          </div>
        )}

        {step === 2 && result && (
          <div className={s.modalBody}>
            <div className={s.successBox}>
              <CheckCircle2
                size={32}
                aria-hidden
                style={{ color: 'var(--ds-status-success-fg)' }}
              />
              <p className={s.successTitle}>درخواست واریز ثبت شد</p>
              <p className={s.successAmt}>{fmtAFN(result.amountCents)}</p>
            </div>
            <div className={s.instructionBox}>
              <p className={s.instructionLabel}>دستورالعمل پرداخت</p>
              <p className={s.instructionText}>
                {result.paymentInstructions ?? 'مبلغ را به حساب صرافی واریز کنید.'}
              </p>
              <div className={s.txnRefBox} dir="ltr">
                شماره پیگیری: <strong>{result.txnRef}</strong>
              </div>
              <div className={s.depositEta}>
                <Info size={11} aria-hidden />
                <span>
                  پس از پرداخت، معمولاً تا {fmtInt(ESTIMATED_PROCESSING_HOURS)} ساعت کاری تأیید
                  می‌شود.
                </span>
              </div>
            </div>
            <button type="button" className={s.outlineBtn} onClick={onClose}>
              بستن
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
