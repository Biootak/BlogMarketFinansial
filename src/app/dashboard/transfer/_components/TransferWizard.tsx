'use client';

/**
 * TransferWizard — 2026 P2P Transfer 4-step wizard
 *
 * گام ۱: انتخاب گیرنده (جستجو با شماره موبایل)
 * گام ۲: وارد کردن مبلغ + خلاصه کارمزد
 * گام ۳: تأیید + OTP اگر مبلغ بالا بود
 * گام ۴: موفقیت + شماره پیگیری
 */

import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  confirmTransfer,
  findTransferRecipient,
  initiateTransfer,
  type RecipientInfo,
  type TransferResult,
} from '@/actions/transfer';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Send,
  User,
} from 'lucide-react';
import { randomBytes } from 'node:crypto';
import { useCallback, useState, useTransition } from 'react';
import s from './TransferWizard.module.css';

type Step = 1 | 2 | 3 | 4;

function formatAFN(cents: number): string {
  return new Intl.NumberFormat('fa-AF', {
    style: 'currency',
    currency: 'AFN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
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
      if (!res.success) { setError(res.error.message); return; }
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
      const idempotencyKey = randomBytes(16).toString('hex');
      const res = await initiateTransfer({
        recipientUserId: recipient.id,
        amountCents,
        currency: 'AFN',
        note: note || undefined,
        idempotencyKey,
      });
      if (!res.success) { setError(res.error.message); return; }
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
      if (!res.success) { setError(res.error.message); return; }
      setFinalTxnId(res.data.txnId);
      setStep(4);
    });
  }, [transferResult, otp]);

  const stepState = (id: number) =>
    id < step ? 'done' : id === step ? 'active' : 'pending';

  const STEPS = [
    { id: 1, label: 'گیرنده', Icon: User },
    { id: 2, label: 'مبلغ', Icon: Send },
    { id: 3, label: 'تأیید', Icon: CheckCircle2 },
    { id: 4, label: 'موفق', Icon: CheckCircle2 },
  ];

  return (
    <div className={s.page}>
      <PageHeader
        title="انتقال وجه"
        description="انتقال P2P سریع و امن به سایر کاربران"
        eyebrow="کیف پول"
        breadcrumb={[
          { href: '/dashboard/wallet', label: 'کیف پول' },
          { label: 'انتقال وجه' },
        ]}
      />

      <div className={s.wizardCard}>
        {/* Stepper */}
        <div className={s.stepper} role="list" aria-label="مراحل انتقال">
          {STEPS.map((st) => {
            const state = stepState(st.id);
            const StepIcon = st.Icon;
            return (
              <div key={st.id} className={`${s.stepItem} ${state}`} role="listitem">
                <div className={`${s.stepDot} ${state}`}>
                  {state === 'done' ? <CheckCircle2 size={15} aria-hidden /> : <StepIcon size={14} aria-hidden />}
                </div>
                <span className={`${s.stepLabel} ${state}`}>{st.label}</span>
              </div>
            );
          })}
        </div>

        {/* ── Step 1: Recipient ── */}
        {step === 1 && (
          <div className={s.form}>
            <h2 className={s.formTitle}>انتخاب گیرنده</h2>
            <p className={s.formDesc}>شماره موبایل گیرنده را جستجو کنید.</p>

            {error && (
              <div className={s.error} role="alert">
                <AlertCircle size={16} aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div className={s.field}>
              <label htmlFor="identifier" className={s.label}>شماره موبایل گیرنده</label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); setError(null); }}
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
            <h2 className={s.formTitle}>مبلغ انتقال</h2>

            {/* Recipient preview */}
            <div className={s.recipientPreview}>
              <div className={s.recipientAvatar} aria-hidden>
                {recipient.fullName.charAt(0)}
              </div>
              <div>
                <p className={s.recipientName}>{recipient.fullName}</p>
                <p className={s.recipientPhone} dir="ltr">{recipient.phone}</p>
              </div>
              <span
                className={s.kycBadge}
                style={recipient.kycStatus === 'APPROVED'
                  ? { background: 'var(--ds-status-success-bg)', color: 'var(--ds-status-success-fg)', border: '1px solid var(--ds-status-success-border)' }
                  : { background: 'var(--ds-status-pending-bg)', color: 'var(--ds-status-pending-fg)', border: '1px solid var(--ds-status-pending-border)' }
                }
              >
                {recipient.kycStatus === 'APPROVED' ? 'تأیید شده' : 'در انتظار'}
              </span>
            </div>

            {error && (
              <div className={s.error} role="alert">
                <AlertCircle size={16} aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div className={s.field}>
              <label htmlFor="amount" className={s.label}>مبلغ (افغانی)</label>
              <Input
                id="amount"
                value={amountRaw}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="۵۰,۰۰۰"
                dir="ltr"
                inputMode="decimal"
                aria-required="true"
              />
              {amountCents > 0 && (
                <p className={s.amountPreview}>{formatAFN(amountCents)}</p>
              )}
            </div>

            {/* Quick amounts */}
            <div className={s.quickAmounts}>
              {QUICK_AMOUNTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${s.quickBtn} ${amountCents === c ? s.quickBtnActive : ''}`}
                  onClick={() => { setAmountCents(c); setAmountRaw(String(c / 100)); }}
                >
                  {formatAFN(c)}
                </button>
              ))}
            </div>

            <div className={s.field}>
              <label htmlFor="note" className={s.label}>یادداشت <span className={s.optional}>(اختیاری)</span></label>
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
            <h2 className={s.formTitle}>تأیید انتقال</h2>

            {/* Summary */}
            <div className={s.summary}>
              {[
                { key: 'گیرنده', val: recipient.fullName },
                { key: 'شماره', val: recipient.phone, dir: 'ltr' as const },
                { key: 'مبلغ', val: formatAFN(amountCents) },
                ...(note ? [{ key: 'یادداشت', val: note }] : []),
              ].map(({ key, val, dir }) => (
                <div key={key} className={s.summaryRow}>
                  <span className={s.summaryKey}>{key}</span>
                  <span className={s.summaryVal} dir={dir}>{val}</span>
                </div>
              ))}
            </div>

            {transferResult.needsOtp && (
              <div className={s.otpSection}>
                <div className={s.otpHint}>
                  <Clock size={15} aria-hidden />
                  <span>کد تأیید به شماره شما ارسال شد (اعتبار: ۵ دقیقه)</span>
                </div>
                {transferResult.devCode && (
                  <p className={s.devCode} dir="ltr">کد آزمایشی: {transferResult.devCode}</p>
                )}
                <div className={s.field}>
                  <label htmlFor="otp" className={s.label}>کد تأیید ۶ رقمی</label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value); setError(null); }}
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
              <div className={s.error} role="alert">
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
            <div className={s.successIcon} aria-hidden>
              <CheckCircle2 size={48} />
            </div>
            <h2 className={s.successTitle}>انتقال موفق!</h2>
            <p className={s.successDesc}>
              {formatAFN(amountCents)} با موفقیت به {recipient?.fullName} ارسال شد.
            </p>
            {finalTxnId && (
              <div className={s.txnId} dir="ltr">
                شماره پیگیری: {finalTxnId.slice(0, 12)}…
              </div>
            )}
            <div style={{ display: 'flex', gap: 'var(--ds-space-3)', marginTop: 'var(--ds-space-4)' }}>
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
