'use client';

/**
 * TransferWizard — 2026 P2P Transfer 4-step wizard
 *
 * گام ۱: انتخاب گیرنده (جستجو با شماره موبایل)
 * گام ۲: وارد کردن مبلغ + خلاصه کارمزد
 * گام ۳: تأیید + OTP اگر مبلغ بالا بود
 * گام ۴: موفقیت + شماره پیگیری
 */

import {
  type RecipientInfo,
  type TransferResult,
  confirmTransfer,
  findTransferRecipient,
  initiateTransfer,
} from '@/actions/transfer';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Clock, Send, User } from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';
import s from './TransferWizard.module.css';

type Step = 1 | 2 | 3 | 4;

function formatAFN(cents: number): string {
  const formatted = new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(cents / 100);
  return `${formatted} AFN`;
}

const QUICK_AMOUNTS = [50_000_00, 100_000_00, 500_000_00]; // cents

export function TransferWizard() {
  const [step, setStep] = useState<Step>(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Step 1 state
  const [identifier, setIdentifier] = useState('');
  const [recipient, setRecipient] = useState<RecipientInfo | null>(null);

  // Step 2 state
  const [amountCents, setAmountCents] = useState(0);
  const [amountRaw, setAmountRaw] = useState('');
  const [note, setNote] = useState('');

  // Step 3 state
  const [transferResult, setTransferResult] = useState<TransferResult | null>(null);
  const [otp, setOtp] = useState('');

  // Step 4 state
  const [finalTxnId, setFinalTxnId] = useState<string | null>(null);

  // ── Step 1: Find recipient ────────────────────────────────────────────────
  const handleFindRecipient = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const res = await findTransferRecipient({ identifier });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setRecipient(res.data);
      setStep(2);
    });
  }, [identifier]);

  // ── Step 2: Amount ────────────────────────────────────────────────────────
  const handleAmountChange = (val: string) => {
    setAmountRaw(val);
    const num = Math.round(Number(val.replace(/[^0-9.]/g, '')) * 100);
    setAmountCents(Number.isNaN(num) ? 0 : num);
  };

  const handleInitiateTransfer = useCallback(() => {
    if (!recipient || amountCents <= 0) {
      setError('مبلغ انتقال باید بزرگتر از صفر باشد');
      return;
    }
    setError(null);
    startTransition(async () => {
      const idempotencyKey = crypto.randomUUID().replace(/-/g, '');
      const res = await initiateTransfer({
        recipientUserId: recipient.id,
        amountCents,
        currency: 'AFN',
        note: note || undefined,
        idempotencyKey,
      });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setTransferResult(res.data);
      setStep(3);
    });
  }, [recipient, amountCents, note]);

  // ── Step 3: Confirm (± OTP) ───────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    if (!transferResult) return;
    setError(null);
    startTransition(async () => {
      const res = await confirmTransfer({
        txnId: transferResult.txnId,
        txnRef: transferResult.txnRef,
        otp: transferResult.needsOtp ? otp : undefined,
      });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setFinalTxnId(res.data.txnId);
      setStep(4);
    });
  }, [transferResult, otp]);

  const stepState = (id: number) => (id < step ? 'done' : id === step ? 'active' : 'pending');

  const STEPS = [
    { id: 1, label: 'گیرنده', Icon: User },
    { id: 2, label: 'مبلغ', Icon: Send },
    { id: 3, label: 'تأیید', Icon: CheckCircle2 },
    { id: 4, label: 'موفق', Icon: CheckCircle2 },
  ];

  return (
    <div className={s.page}>
      <PageHeader
        variant="strip"
        title="انتقال P2P"
        description="ارسال فوری افغانی به دوستان، همکاران و خانواده — انتقال مستقیم بین کاربران ثبت‌شده"
        eyebrow="عملیات مالی"
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'انتقال P2P' }]}
      />

      <div className={s.wizardCard}>
        {/* ── Stepper ── */}
        <div className={s.stepper} aria-label="مراحل انتقال">
          {STEPS.map((st, i) => {
            const state = stepState(st.id);
            const StepIcon = st.Icon;
            return (
              <div key={st.id} className={s.stepItem}>
                {i > 0 && (
                  <div
                    className={`${s.stepConnector} ${stepState(st.id - 1) === 'done' ? s.stepConnectorDone : ''}`}
                    aria-hidden
                  />
                )}
                <div
                  className={`${s.stepDot} ${s[`stepDot_${state}`]}`}
                  aria-current={state === 'active' ? 'step' : undefined}
                >
                  {state === 'done' ? (
                    <CheckCircle2 size={15} aria-hidden />
                  ) : (
                    <StepIcon size={14} aria-hidden />
                  )}
                </div>
                <span className={`${s.stepLabel} ${s[`stepLabel_${state}`]}`}>{st.label}</span>
              </div>
            );
          })}
        </div>

        {/* ── Step 1: Recipient ── */}
        {step === 1 && (
          <div className={s.form}>
            <div className={s.formHead}>
              <h2 className={s.formTitle}>انتخاب گیرنده</h2>
              <p className={s.formDesc}>شماره موبایل گیرنده را جستجو کنید.</p>
            </div>

            {error && (
              <div className={s.errorBox} role="alert">
                <AlertCircle size={16} aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div className={s.fieldGroup}>
              <label htmlFor="identifier" className={s.fieldLabel}>
                شماره موبایل گیرنده
              </label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError(null);
                }}
                placeholder="+93700000000"
                dir="ltr"
                type="tel"
                inputMode="tel"
                aria-required="true"
                onKeyDown={(e) => e.key === 'Enter' && handleFindRecipient()}
              />
            </div>

            <div className={s.footer}>
              <span />
              <Button onClick={handleFindRecipient} disabled={isPending || !identifier}>
                {isPending ? 'جستجو...' : 'جستجو'}
                <ArrowLeft size={14} aria-hidden />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Amount ── */}
        {step === 2 && recipient && (
          <div className={s.form}>
            <div className={s.formHead}>
              <h2 className={s.formTitle}>مبلغ انتقال</h2>
            </div>

            {/* Recipient Card */}
            <div className={s.recipientCard}>
              <div className={s.recipientAvatar} aria-hidden>
                {recipient.fullName.charAt(0)}
              </div>
              <div className={s.recipientInfo}>
                <p className={s.recipientName}>{recipient.fullName}</p>
                <p className={s.recipientPhone} dir="ltr">
                  {recipient.phone}
                </p>
              </div>
              <span
                className={s.kycBadge}
                data-status={recipient.kycStatus === 'APPROVED' ? 'APPROVED' : 'PENDING'}
              >
                {recipient.kycStatus === 'APPROVED' ? 'تأیید شده' : 'در انتظار'}
              </span>
            </div>

            {error && (
              <div className={s.errorBox} role="alert">
                <AlertCircle size={16} aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div className={s.fieldGroup}>
              <label htmlFor="amount" className={s.fieldLabel}>
                مبلغ (افغانی)
              </label>
              <Input
                id="amount"
                value={amountRaw}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="۵۰,۰۰۰"
                dir="ltr"
                inputMode="decimal"
                aria-required="true"
              />
              {amountCents > 0 && <p className={s.amountPreview}>{formatAFN(amountCents)}</p>}
            </div>

            <div className={s.quickAmounts}>
              {QUICK_AMOUNTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${s.quickBtn} ${amountCents === c ? s.quickBtnActive : ''}`}
                  onClick={() => {
                    setAmountCents(c);
                    setAmountRaw(String(c / 100));
                  }}
                >
                  {formatAFN(c)}
                </button>
              ))}
            </div>

            {/* Fee transparency (Structural Honesty) */}
            {amountCents > 0 && (
              <div className={s.feeSummary}>
                <div className={s.feeRow}>
                  <span className={s.feeKey}>مبلغ ارسالی</span>
                  <span className={s.feeVal}>{formatAFN(amountCents)}</span>
                </div>
                <div className={s.feeRow}>
                  <span className={s.feeKey}>کارمزد سرویس</span>
                  <span className={s.feeVal}>رایگان</span>
                </div>
                <div className={`${s.feeRow} ${s['feeRow--total']}`}>
                  <span className={s.feeKey}>دریافتی گیرنده</span>
                  <span className={`${s.feeVal} ${s['feeVal--accent']}`}>
                    {formatAFN(amountCents)}
                  </span>
                </div>
              </div>
            )}

            <div className={s.fieldGroup}>
              <label htmlFor="note" className={s.fieldLabel}>
                یادداشت <span className={s.optional}>(اختیاری)</span>
              </label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="توضیح کوتاه"
                maxLength={200}
              />
            </div>

            <div className={s.footer}>
              <Button variant="outline" onClick={() => setStep(1)} disabled={isPending}>
                <ArrowRight size={14} aria-hidden /> قبلی
              </Button>
              <Button onClick={handleInitiateTransfer} disabled={isPending || amountCents <= 0}>
                {isPending ? 'در حال پردازش...' : 'ادامه'}
                {!isPending && <ArrowLeft size={14} aria-hidden />}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === 3 && transferResult && recipient && (
          <div className={s.form}>
            <div className={s.formHead}>
              <h2 className={s.formTitle}>تأیید انتقال</h2>
            </div>

            <div className={s.summary}>
              {[
                { key: 'گیرنده', val: recipient.fullName },
                { key: 'شماره', val: recipient.phone, dir: 'ltr' as const },
                { key: 'مبلغ', val: formatAFN(amountCents) },
                ...(note ? [{ key: 'یادداشت', val: note }] : []),
              ].map(({ key, val, dir }) => (
                <div key={key} className={s.summaryRow}>
                  <span className={s.summaryKey}>{key}</span>
                  <span className={s.summaryVal} dir={dir}>
                    {val}
                  </span>
                </div>
              ))}
            </div>

            {transferResult.needsOtp && (
              <div className={s.otpSection}>
                <div className={s.otpHint}>
                  <Clock size={15} aria-hidden />
                  <span>کد تأیید به شماره شما ارسال شد (اعتبار: ۵ دقیقه)</span>
                </div>
                <div className={s.fieldGroup}>
                  <label htmlFor="otp" className={s.fieldLabel}>
                    کد تأیید ۶ رقمی
                  </label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value);
                      setError(null);
                    }}
                    placeholder="000000"
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    aria-required="true"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className={s.errorBox} role="alert">
                <AlertCircle size={16} aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div className={s.footer}>
              <Button variant="outline" onClick={() => setStep(2)} disabled={isPending}>
                <ArrowRight size={14} aria-hidden /> قبلی
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isPending || (transferResult.needsOtp && otp.length < 6)}
              >
                {isPending ? 'در حال ارسال...' : 'تأیید و ارسال'}
                {!isPending && <Send size={14} aria-hidden />}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Success ── */}
        {step === 4 && (
          <div className={s.successView}>
            <div className={s.successRing} aria-hidden>
              <CheckCircle2 size={40} />
            </div>
            <p className={s.successAmount}>{formatAFN(amountCents)}</p>
            <h2 className={s.successTitle}>انتقال موفق انجام شد</h2>
            <p className={s.successDesc}>با موفقیت به {recipient?.fullName} ارسال شد.</p>
            {finalTxnId && (
              <div className={s.txnIdBox}>
                <span className={s.txnIdLabel}>شماره پیگیری</span>
                <span className={s.txnIdVal} dir="ltr">
                  {finalTxnId.slice(0, 16)}…
                </span>
              </div>
            )}
            <div className={s.successActions}>
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setRecipient(null);
                  setIdentifier('');
                  setAmountCents(0);
                  setAmountRaw('');
                  setNote('');
                  setOtp('');
                  setTransferResult(null);
                  setFinalTxnId(null);
                  setError(null);
                }}
              >
                انتقال جدید
              </Button>
              <Button asChild>
                <a href="/dashboard/wallet">مشاهده کیف پول</a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
