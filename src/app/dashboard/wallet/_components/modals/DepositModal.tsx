'use client';

import { useCallback, useState, useTransition } from 'react';
import { Download, X, CheckCircle2 } from 'lucide-react';
import { requestDeposit, type DepositResult } from '@/actions/fintech-account';
import s from '../WalletClient.module.css';

interface DepositModalProps {
  onClose: () => void;
  currency: string;
}

function fmtAFN(amount: string): string {
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('fa-AF', {
    style: 'currency',
    currency: 'AFN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n / 100);
}

export function DepositModal({ onClose, currency }: DepositModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [result, setResult] = useState<DepositResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startT] = useTransition();

  const handleRequest = useCallback(() => {
    if (amountCents <= 0) {
      setError('مبلغ را وارد کنید');
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
  }, [amountCents, currency]);

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
              />
              {amountCents > 0 && <p className={s.fieldHint}>{fmtAFN(String(amountCents))}</p>}
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
                  }}
                >
                  {fmtAFN(String(c))}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={s.primaryBtn}
              onClick={handleRequest}
              disabled={isPending || amountCents <= 0}
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
              <p className={s.successAmt}>{fmtAFN(String(result.amountCents))}</p>
            </div>
            <div className={s.instructionBox}>
              <p className={s.instructionLabel}>دستورالعمل پرداخت</p>
              <p className={s.instructionText}>
                {result.paymentInstructions ?? 'مبلغ را به حساب صرافی واریز کنید.'}
              </p>
              <div className={s.txnRefBox} dir="ltr">
                شماره پیگیری: <strong>{result.txnRef}</strong>
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
