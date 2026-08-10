'use client';

/**
 * WalletClient — 2026 Million-dollar Fintech Wallet
 *
 * Redesign 2026-07:
 * - Hero balance card با ambient SVG stroke rings + system-breath pulse
 * - Deposit / Withdraw modals با OTP flow
 * - Ledger با infinite scroll cursor pagination
 * - Multi-account switcher (اگر بیشتر از یک حساب)
 * - KYC status banner با progress indicator
 * - همه ۵ حالت: loading / empty / error / success / disabled
 */

import {
  type DepositResult,
  type WithdrawResult,
  confirmWithdraw,
  requestDeposit,
  requestWithdraw,
} from '@/actions/fintech-account';
import { type FxQuote, type FxTradeResult, executeFxTrade, getFxQuote } from '@/actions/fx-trade';
import { type CurrencyItem, CurrencySelect } from '@/components/ui/CurrencySelect';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  BarChart2,
  CheckCircle2,
  Clock,
  Coins,
  Download,
  Send,
  ShieldAlert,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import s from './WalletClient.module.css';

const _faNum = new Intl.NumberFormat('fa-IR');

type Account = { id: string; currency: string; balance: string; status: string; type: string };
type WalletData = {
  customerId: string;
  fullName: string;
  kycLevel: string;
  kycStatus: string;
  accounts: Account[];
};
type LedgerEntry = {
  id: string;
  direction: 'DEBIT' | 'CREDIT';
  amount: string;
  currency: string;
  description: string | null;
  createdAt: string;
  runningBalance: string;
};
type Props = { walletData: WalletData | null; userRole: string };
type ModalType = 'deposit' | 'withdraw' | 'fx' | null;

/** مسیرهای نقش‌مبنا — هر نقش به مسیر خودش می‌رود. */
function pathsFor(role: string) {
  if (role === 'CUSTOMER' || role === 'TEST_CUSTOMER' || role === 'MERCHANT') {
    return {
      transfer: '/customer/transfer',
      deals: '/customer/wallet#transactions',
      kyc: '/customer/kyc',
    };
  }
  return {
    transfer: '/dashboard/transfer',
    deals: '/dashboard/my-deals',
    kyc: '/customer/kyc',
  };
}

const FX_CURRENCIES = ['AFN', 'USD', 'EUR', 'IRR'] as const;
type FxCurrency = (typeof FX_CURRENCIES)[number];

const FX_LABELS: Record<FxCurrency, string> = {
  AFN: 'افغانی',
  USD: 'دلار',
  EUR: 'یورو',
  IRR: 'ریال ایران',
};

const FX_ITEMS: CurrencyItem[] = FX_CURRENCIES.map((c) => ({
  value: c,
  code: c,
  label: FX_LABELS[c],
}));

function formatFxAmount(cents: number, currency: FxCurrency): string {
  // 2026-07-29: هیچ ارزی در سیستم ما decimal نیست؛ مقدار ورودی سِنت (عدد صحیح) است
  // AFN: عدد فارسی + " AFN" بعد از عدد (نه «ف» جلوی عدد)
  if (currency === 'AFN') {
    const formatted = new Intl.NumberFormat('fa-IR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true,
    }).format(cents);
    return `${formatted} AFN`;
  }
  return new Intl.NumberFormat('fa-IR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents);
}

function fmtAFN(amount: string): string {
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  const formatted = new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(n / 100);
  return `${formatted} AFN`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Ambient SVG pulse rings — signature moment */
function AmbientRings() {
  return (
    <div className={s.heroAmbient} aria-hidden="true">
      <svg className={s.heroAmbientSvg} viewBox="0 0 280 280" fill="none" role="presentation">
        <title>decorative rings</title>
        <circle
          cx="140"
          cy="140"
          r="120"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeDasharray="6 4"
          style={{ color: 'var(--ds-brand-400)', opacity: 0.45 }}
        />
        <circle
          cx="140"
          cy="140"
          r="90"
          stroke="currentColor"
          strokeWidth="1"
          style={{ color: 'var(--ds-brand-400)', opacity: 0.3 }}
        />
        <circle
          cx="140"
          cy="140"
          r="58"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ color: 'var(--ds-brand-400)', opacity: 0.2 }}
        />
        <circle
          cx="140"
          cy="140"
          r="28"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: 'var(--ds-brand-500)', opacity: 0.15 }}
        />
        <circle
          cx="140"
          cy="20"
          r="3.5"
          fill="currentColor"
          style={{ color: 'var(--ds-brand-500)', opacity: 0.6 }}
          className={s.breathDot}
        />
      </svg>
    </div>
  );
}

// ─── Deposit Modal ─────────────────────────────────────────────────────────────
function DepositModal({ onClose, currency }: { onClose: () => void; currency: string }) {
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

// ─── Withdraw Modal ────────────────────────────────────────────────────────────
function WithdrawModal({
  onClose,
  currency,
  maxCents,
}: { onClose: () => void; currency: string; maxCents: number }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [dest, setDest] = useState('');
  const [result, setResult] = useState<WithdrawResult | null>(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startT] = useTransition();

  const handleRequest = useCallback(() => {
    if (amountCents <= 0) {
      setError('مبلغ را وارد کنید');
      return;
    }
    if (!dest.trim()) {
      setError('حساب مقصد را وارد کنید');
      return;
    }
    if (amountCents > maxCents) {
      setError('موجودی کافی نیست');
      return;
    }
    setError(null);
    startT(async () => {
      const res = await requestWithdraw({
        amountCents,
        currency,
        destinationAccount: dest,
        idempotencyKey: crypto.randomUUID().replace(/-/g, ''),
      });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setResult(res.data);
      if (res.data.needsOtp) setStep(2);
      else setStep(3);
    });
  }, [amountCents, currency, dest, maxCents]);

  const handleConfirm = useCallback(() => {
    if (!result) return;
    setError(null);
    startT(async () => {
      const res = await confirmWithdraw({
        txnId: result.txnId,
        txnRef: result.txnRef,
        otp: result.needsOtp ? otp : undefined,
      });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setStep(3);
    });
  }, [result, otp]);

  return (
    <dialog
      className={s.modalOverlay}
      aria-label="برداشت وجه"
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
            <Upload size={18} aria-hidden style={{ color: 'var(--ds-status-error-fg)' }} />
            برداشت وجه
          </div>
          <button type="button" className={s.modalClose} onClick={onClose} aria-label="بستن">
            <X size={16} />
          </button>
        </div>

        {step === 1 && (
          <div className={s.modalBody}>
            <p className={s.modalHint}>مبلغ برداشت و شماره حساب مقصد را وارد کنید.</p>
            {error && (
              <div className={s.inlineError} role="alert">
                {error}
              </div>
            )}
            <div className={s.fieldGroup}>
              <label htmlFor="wd-amount" className={s.fieldLabel}>
                مبلغ (افغانی)
              </label>
              <input
                id="wd-amount"
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
              {amountCents > 0 && (
                <p className={`${s.fieldHint} ${amountCents > maxCents ? s.fieldHintError : ''}`}>
                  {fmtAFN(String(amountCents))} {amountCents > maxCents ? '— بیش از موجودی' : ''}
                </p>
              )}
            </div>
            <div className={s.fieldGroup}>
              <label htmlFor="wd-dest" className={s.fieldLabel}>
                شماره حساب / شبا
              </label>
              <input
                id="wd-dest"
                type="text"
                className={s.fieldInput}
                dir="ltr"
                value={dest}
                onChange={(e) => {
                  setDest(e.target.value);
                  setError(null);
                }}
                placeholder="شماره حساب بانکی یا کارت"
              />
            </div>
            <button
              type="button"
              className={s.primaryBtn}
              onClick={handleRequest}
              disabled={isPending || amountCents <= 0 || !dest.trim()}
            >
              {isPending ? 'در حال پردازش…' : 'درخواست برداشت'}
            </button>
          </div>
        )}

        {step === 2 && result?.needsOtp && (
          <div className={s.modalBody}>
            <div className={s.otpHint}>
              <Clock size={16} aria-hidden />
              <span>کد تأیید ۶ رقمی به شماره شما ارسال شد (اعتبار ۵ دقیقه)</span>
            </div>
            {error && (
              <div className={s.inlineError} role="alert">
                {error}
              </div>
            )}
            <div className={s.fieldGroup}>
              <label htmlFor="wd-otp" className={s.fieldLabel}>
                کد تأیید
              </label>
              <input
                id="wd-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                className={s.fieldInput}
                dir="ltr"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  setError(null);
                }}
                placeholder="000000"
                aria-required
              />
            </div>
            <button
              type="button"
              className={s.primaryBtn}
              onClick={handleConfirm}
              disabled={isPending || otp.length < 6}
            >
              {isPending ? 'در حال تأیید…' : 'تأیید برداشت'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className={s.modalBody}>
            <div className={s.successBox}>
              <CheckCircle2
                size={32}
                aria-hidden
                style={{ color: 'var(--ds-status-success-fg)' }}
              />
              <p className={s.successTitle}>درخواست برداشت ثبت شد</p>
              <p className={s.successAmt}>{fmtAFN(String(amountCents))}</p>
            </div>
            <p className={s.modalHint}>مبلغ پس از بررسی توسط صرافی واریز می‌شود.</p>
            <button type="button" className={s.outlineBtn} onClick={onClose}>
              بستن
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}

// ─── FX Trade Modal ───────────────────────────────────────────────────────────
function FxTradeModal({
  onClose,
  accounts,
  defaultFrom,
}: {
  onClose: () => void;
  accounts: Account[];
  defaultFrom: string;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [fromCurrency, setFromCurrency] = useState<string>(defaultFrom);
  const [toCurrency, setToCurrency] = useState<string>(defaultFrom === 'AFN' ? 'USD' : 'AFN');
  const [amount, setAmount] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [quote, setQuote] = useState<FxQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [result, setResult] = useState<FxTradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startT] = useTransition();
  const [loadingQuote, setLoadingQuote] = useState(false);

  // دریافت نرخ هر بار که جفت ارز تغییر می‌کند
  useEffect(() => {
    if (fromCurrency === toCurrency) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let cancelled = false;
    setLoadingQuote(true);
    setQuoteError(null);
    startT(async () => {
      const res = await getFxQuote({
        fromCurrency: fromCurrency as FxCurrency,
        toCurrency: toCurrency as FxCurrency,
      });
      if (cancelled) return;
      if (!res.success) {
        setQuote(null);
        setQuoteError(res.error.message);
      } else {
        setQuote(res.data);
      }
      setLoadingQuote(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fromCurrency, toCurrency]);

  const fromAccount = accounts.find((a) => a.currency === fromCurrency);
  const maxCents = fromAccount ? Number(fromAccount.balance) : 0;

  // محاسبه زنده مقدار مقصد
  const previewToCents =
    quote && amountCents > 0
      ? Math.floor(amountCents * (1 - quote.feePercent / 100) * quote.rate)
      : 0;

  const feeCents =
    quote && amountCents > 0 ? Math.floor((amountCents * quote.feePercent) / 100) : 0;

  function handleSwap() {
    const prevFrom = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(prevFrom);
    setAmount('');
    setAmountCents(0);
  }

  const handleSubmit = useCallback(() => {
    setError(null);
    if (amountCents <= 0) {
      setError('مبلغ را وارد کنید');
      return;
    }
    if (amountCents > maxCents) {
      setError('موجودی مبدأ کافی نیست');
      return;
    }
    if (!quote) {
      setError('نرخی برای این جفت ارز موجود نیست');
      return;
    }
    startT(async () => {
      const res = await executeFxTrade({
        fromCurrency,
        toCurrency,
        amountCents,
        idempotencyKey: crypto.randomUUID().replace(/-/g, ''),
      });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setResult(res.data);
      setStep(2);
    });
  }, [amountCents, fromCurrency, toCurrency, maxCents, quote]);

  return (
    <dialog
      className={s.modalOverlay}
      aria-label="تبدیل ارز"
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
            <Coins size={18} aria-hidden style={{ color: 'var(--ds-brand-500)' }} />
            تبدیل ارز
          </div>
          <button type="button" className={s.modalClose} onClick={onClose} aria-label="بستن">
            <X size={16} />
          </button>
        </div>

        {step === 1 && (
          <div className={s.modalBody}>
            <p className={s.modalHint}>
              ارز مبدأ و مقصد را انتخاب کنید. نرخ از صرافی شما خوانده می‌شود.
            </p>
            {error && (
              <div className={s.inlineError} role="alert">
                {error}
              </div>
            )}

            {/* Currency selectors */}
            <div className={s.fxRow}>
              <div className={s.fieldGroup}>
                <label htmlFor="fx-from" className={s.fieldLabel}>
                  از ارز
                </label>
                <CurrencySelect
                  items={FX_ITEMS}
                  value={fromCurrency}
                  onChange={setFromCurrency}
                  ariaLabel="ارز مبدأ"
                  size="wide"
                />
                {fromAccount && (
                  <p className={s.fieldHint}>موجودی: {fmtAFN(fromAccount.balance)}</p>
                )}
              </div>

              <button
                type="button"
                onClick={handleSwap}
                aria-label="جابجایی"
                className={s.fxSwapBtn}
              >
                <ArrowLeftRight size={15} aria-hidden />
              </button>

              <div className={s.fieldGroup}>
                <label htmlFor="fx-to" className={s.fieldLabel}>
                  به ارز
                </label>
                <CurrencySelect
                  items={FX_ITEMS.filter((it) => it.value !== fromCurrency)}
                  value={toCurrency}
                  onChange={setToCurrency}
                  ariaLabel="ارز مقصد"
                  size="wide"
                />
                {quoteError && <p className={s.fxHintError}>{quoteError}</p>}
              </div>
            </div>

            {/* Amount */}
            <div className={s.fieldGroup}>
              <label htmlFor="fx-amount" className={s.fieldLabel}>
                مبلغ ({fromCurrency})
              </label>
              <input
                id="fx-amount"
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
                placeholder={`مثلاً ۱۰۰۰ ${fromCurrency}`}
                disabled={!quote || loadingQuote}
              />
              {amountCents > 0 && fromAccount && amountCents > maxCents && (
                <p className={s.fxHintError}>بیش از موجودی ({fmtAFN(String(maxCents))})</p>
              )}
            </div>

            {/* Quote summary */}
            {quote && (
              <div className={s.fxQuote}>
                <div className={s.fxQuoteRow}>
                  <span className={s.fxQuoteLabel}>نرخ صرافی</span>
                  <span dir="ltr" className={s.fxQuoteValue}>
                    1 {quote.fromCurrency} ={' '}
                    {new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(
                      quote.rate,
                    )}{' '}
                    {quote.toCurrency}
                  </span>
                </div>
                <div className={s.fxQuoteRow}>
                  <span className={s.fxQuoteLabel}>کارمزد</span>
                  <span>
                    {quote.feePercent.toFixed(2)}٪ (
                    {formatFxAmount(feeCents, quote.fromCurrency as FxCurrency)})
                  </span>
                </div>
                {previewToCents > 0 && (
                  <div className={s.fxQuoteTotalRow}>
                    <span>دریافتی شما</span>
                    <span className={s.fxQuoteValueSuccess}>
                      {formatFxAmount(previewToCents, quote.toCurrency as FxCurrency)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {loadingQuote && <p className={s.fxQuotePending}>در حال دریافت نرخ…</p>}

            <button
              type="button"
              className={s.primaryBtn}
              onClick={handleSubmit}
              disabled={isPending || amountCents <= 0 || !quote || amountCents > maxCents}
            >
              {isPending ? 'در حال تبدیل…' : 'تأیید و تبدیل'}
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
              <p className={s.successTitle}>تبدیل با موفقیت انجام شد</p>
              <p className={s.successAmt}>
                {formatFxAmount(result.fromAmountCents, result.fromCurrency)}
                {' → '}
                {formatFxAmount(result.toAmountCents, result.toCurrency)}
              </p>
            </div>
            <div className={s.instructionBox}>
              <p className={s.instructionLabel}>جزئیات</p>
              <div className={s.fxDetailsGrid}>
                <span className={s.fxQuoteLabel}>نرخ</span>
                <span dir="ltr" className={s.fxDetailsValue}>
                  1 {result.fromCurrency} ={' '}
                  {new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(result.rate)}{' '}
                  {result.toCurrency}
                </span>
                <span className={s.fxQuoteLabel}>کارمزد</span>
                <span className={s.fxDetailsValue}>
                  {formatFxAmount(result.feeCents, result.fromCurrency)}
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

// ─── Main Component ───────────────────────────────────────────────────────────
export function WalletClient({ walletData, userRole }: Props) {
  const paths = pathsFor(userRole);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [activeAccountIdx, setActiveAccountIdx] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchEntries = useCallback(async (cursor?: string) => {
    const isMore = !!cursor;
    if (isMore) setLoadingMore(true);
    else setLoading(true);
    setFetchError(null);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const url = `/api/customer/transactions?limit=20${cursor ? `&cursor=${cursor}` : ''}`;
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error('خطا در دریافت تراکنش‌ها');
      const json = (await res.json()) as {
        success: boolean;
        data?: { entries: LedgerEntry[]; nextCursor: string | null; hasMore: boolean };
        error?: { message: string };
      };
      if (!json.success || !json.data) throw new Error(json.error?.message ?? 'خطای ناشناخته');
      const data = json.data;
      if (isMore) setEntries((prev) => [...prev, ...data.entries]);
      else setEntries(data.entries);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setFetchError((err as Error).message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    return () => abortRef.current?.abort();
  }, [fetchEntries]);

  // refresh ledger after modal close
  const handleModalClose = useCallback(
    (refreshNeeded = false) => {
      setActiveModal(null);
      if (refreshNeeded) fetchEntries();
    },
    [fetchEntries],
  );

  if (!walletData) {
    return (
      <div className={s.noCustomer}>
        <Wallet size={48} aria-hidden style={{ color: 'var(--ds-text-muted)', opacity: 0.3 }} />
        <h1 className={s.noCustomerTitle}>کیف پول هنوز فعال نشده</h1>
        <p className={s.noCustomerDesc}>
          برای فعال‌سازی کیف پول، ابتدا اطلاعات هویتی خود را تکمیل کنید.
        </p>
        <Link href="/customer/kyc" className={s.ctaLink}>
          <ShieldAlert size={16} aria-hidden /> احراز هویت (KYC)
        </Link>
      </div>
    );
  }

  const primaryAccount = walletData.accounts[activeAccountIdx] ?? walletData.accounts[0];
  const kycApproved = walletData.kycStatus === 'APPROVED';
  const maxCents = primaryAccount ? Number(primaryAccount.balance) : 0;

  return (
    <div className={s.page}>
      {/* KYC Banner */}
      {!kycApproved && (
        <div className={s.kycBanner} role="alert">
          <ShieldAlert
            size={18}
            aria-hidden
            style={{ color: 'var(--ds-status-pending-fg)', flexShrink: 0 }}
          />
          <div className={s.kycBannerContent}>
            <p className={s.kycBannerText}>
              برای استفاده کامل از کیف پول، احراز هویت خود را تکمیل کنید.
            </p>
            <div className={s.kycProgress}>
              <div
                className={s.kycProgressBar}
                style={{
                  width:
                    walletData.kycLevel === 'NONE'
                      ? '10%'
                      : walletData.kycLevel === 'LEVEL_1'
                        ? '50%'
                        : '80%',
                }}
              />
            </div>
          </div>
          <Link href="/customer/kyc" className={s.kycBannerLink} aria-label="احراز هویت">
            تکمیل ←
          </Link>
        </div>
      )}

      {/* Hero Balance Card */}
      <div className={s.hero} aria-label="موجودی کیف پول">
        <AmbientRings />
        <div className={s.heroInner}>
          <p className={s.heroEyebrow}>موجودی کل</p>
          <div className={s.heroBalanceRow}>
            <span className={s.heroBalance} aria-live="polite">
              {primaryAccount ? fmtAFN(primaryAccount.balance) : '—'}
            </span>
            {primaryAccount && <span className={s.heroCurrency}>{primaryAccount.currency}</span>}
          </div>
          <div className={s.heroMeta}>
            {kycApproved && primaryAccount && (
              <span className={s.heroBadge}>
                <span className={s.heroBadgeDot} aria-hidden />
                حساب فعال
              </span>
            )}
            {walletData.fullName && <span className={s.heroName}>{walletData.fullName}</span>}
          </div>
        </div>

        {/* Account switcher */}
        {walletData.accounts.length > 1 && (
          <div className={s.accountTabs} role="tablist" aria-label="انتخاب حساب">
            {walletData.accounts.map((a, i) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={i === activeAccountIdx}
                className={`${s.accountTab} ${i === activeAccountIdx ? s.accountTabActive : ''}`}
                onClick={() => setActiveAccountIdx(i)}
              >
                {a.currency}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className={s.actions} aria-label="عملیات سریع">
        {[
          {
            label: 'واریز',
            Icon: Download,
            action: () => setActiveModal('deposit'),
            disabled: !kycApproved,
            accent: 'success',
          },
          {
            label: 'برداشت',
            Icon: Upload,
            action: () => setActiveModal('withdraw'),
            disabled: !kycApproved || maxCents <= 0,
            accent: 'error',
          },
          { label: 'انتقال', Icon: Send, href: paths.transfer, accent: 'brand' },
          {
            label: 'تبدیل ارز',
            Icon: ArrowLeftRight,
            action: () => setActiveModal('fx'),
            disabled: !kycApproved || walletData.accounts.length === 0,
            accent: 'default',
          },
          {
            label: 'معاملات',
            Icon: ArrowLeftRight,
            href: paths.deals,
            accent: 'default',
          },
          { label: 'گزارش', Icon: BarChart2, anchor: '#transactions', accent: 'default' },
        ].map(({ label, Icon, action, href, anchor, disabled, accent }) => {
          const cls = `${s.actionBtn} ${s[`actionBtn--${accent}`] ?? ''}`;
          if (href)
            return (
              <Link key={label} href={href} className={cls} aria-label={label}>
                <span className={s.actionIcon}>
                  <Icon size={20} aria-hidden />
                </span>
                <span className={s.actionLabel}>{label}</span>
              </Link>
            );
          if (anchor)
            return (
              <a key={label} href={anchor} className={cls} aria-label={label}>
                <span className={s.actionIcon}>
                  <Icon size={20} aria-hidden />
                </span>
                <span className={s.actionLabel}>{label}</span>
              </a>
            );
          return (
            <button
              key={label}
              type="button"
              className={cls}
              onClick={action}
              disabled={!!disabled}
              aria-label={label}
            >
              <span className={s.actionIcon}>
                <Icon size={20} aria-hidden />
              </span>
              <span className={s.actionLabel}>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Transactions */}
      <section className={s.txSection} id="transactions" aria-label="تاریخچه تراکنش‌ها">
        <div className={s.txHeader}>
          <h2 className={s.txTitle}>تاریخچه تراکنش‌ها</h2>
          {entries.length > 0 && (
            <span className={s.txCount}>{_faNum.format(entries.length)} مورد</span>
          )}
        </div>

        {loading && (
          <div className={s.txList} aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
              <div key={i} className={s.txSkeleton}>
                <Skeleton className={s.skDot} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <Skeleton className={s.skLine} style={{ width: '60%' }} />
                  <Skeleton className={s.skLine} style={{ width: '35%', height: '10px' }} />
                </div>
                <Skeleton
                  style={{ width: '70px', height: '14px', borderRadius: 'var(--ds-radius-sm)' }}
                />
              </div>
            ))}
          </div>
        )}

        {!loading && fetchError && (
          <div className={s.txError} role="alert">
            <p style={{ marginBottom: 'var(--ds-space-2)' }}>{fetchError}</p>
            <button type="button" onClick={() => fetchEntries()} className={s.loadMoreBtn}>
              تلاش مجدد
            </button>
          </div>
        )}

        {!loading && !fetchError && entries.length === 0 && (
          <div className={s.txEmpty}>
            <ArrowLeftRight size={36} className={s.txEmptyIcon} aria-hidden />
            <p className={s.txEmptyTitle}>هنوز تراکنشی ثبت نشده</p>
            <p className={s.txEmptyDesc}>اولین واریز خود را انجام بده تا تاریخچه‌ات شروع شود.</p>
          </div>
        )}

        {!loading && entries.length > 0 && (
          <ul className={s.txList}>
            {entries.map((entry) => (
              <li key={entry.id} className={s.txRow}>
                <div
                  className={entry.direction === 'CREDIT' ? s.txDotCredit : s.txDotDebit}
                  aria-hidden
                >
                  {entry.direction === 'CREDIT' ? <ArrowDown size={15} /> : <ArrowUp size={15} />}
                </div>
                <div className={s.txMeta}>
                  <p className={s.txDesc}>
                    {entry.description ?? (entry.direction === 'CREDIT' ? 'واریز' : 'برداشت')}
                  </p>
                  <p className={s.txDate}>{fmtDate(entry.createdAt)}</p>
                </div>
                <div className={s.txAmountCol}>
                  <span
                    className={`${s.txAmount} ${entry.direction === 'CREDIT' ? s.txAmountCredit : s.txAmountDebit}`}
                    aria-label={`${entry.direction === 'CREDIT' ? 'واریز' : 'برداشت'} ${fmtAFN(entry.amount)}`}
                  >
                    {entry.direction === 'CREDIT' ? '＋' : '−'}
                    {fmtAFN(entry.amount)}
                  </span>
                  <span className={s.txBalance}>{fmtAFN(entry.runningBalance)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {hasMore && !loading && (
          <div className={s.loadMore}>
            <button
              type="button"
              onClick={() => fetchEntries(nextCursor ?? undefined)}
              disabled={loadingMore}
              className={s.loadMoreBtn}
            >
              {loadingMore ? 'در حال بارگذاری...' : 'بارگذاری بیشتر'}
            </button>
          </div>
        )}
      </section>

      {/* Modals */}
      {activeModal === 'deposit' && primaryAccount && (
        <DepositModal currency={primaryAccount.currency} onClose={() => handleModalClose(true)} />
      )}
      {activeModal === 'withdraw' && primaryAccount && (
        <WithdrawModal
          currency={primaryAccount.currency}
          maxCents={maxCents}
          onClose={() => handleModalClose(true)}
        />
      )}
      {activeModal === 'fx' && (
        <FxTradeModal
          accounts={walletData.accounts}
          defaultFrom={primaryAccount?.currency ?? 'AFN'}
          onClose={() => handleModalClose(true)}
        />
      )}
    </div>
  );
}
