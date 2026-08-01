'use client';

/**
 * TransferClient — عملیات مالی (واریز / برداشت / انتقال / تبدیل)
 * ----------------------------------------------------------------------------
 * Tab pattern: ۴ تب با فرم‌های مستقل.
 * هر فرم idempotencyKey تولید می‌کند و call به server action می‌زند.
 *
 * States: idle / loading / success / error / empty
 * A11y: ARIA labels, keyboard nav, focus management
 */

import type { CustomerAccountDetail, CustomerProfile } from '@/actions/customer-portal';
import { type InternalTransferResult, transferBetweenAccounts } from '@/actions/customer-portal';
import {
  type DepositResult,
  type WithdrawResult,
  confirmWithdraw,
  requestDeposit,
  requestWithdraw,
} from '@/actions/fintech-account';
import { executeFxTrade, getFxQuote } from '@/actions/fx-trade';
import { ACCOUNT_TYPE_LABEL } from '@/app/(customer)/customer/_lib/customer-formatters';
import { type CurrencyItem, CurrencySelect } from '@/components/ui/CurrencySelect';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Download,
  Send,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useState, useTransition } from 'react';
import s from './TransferClient.module.css';

type TabId = 'deposit' | 'withdraw' | 'transfer' | 'exchange';
type ResultKind = 'success' | 'error';
type ResultState = { kind: ResultKind; message: string; ref?: string } | null;

interface Props {
  profile: CustomerProfile;
  accounts: CustomerAccountDetail[];
  initialAction?: string;
  presetAccountId?: string;
}

const TABS: Array<{
  id: TabId;
  label: string;
  Icon: typeof Download;
  accent: 'success' | 'error' | 'brand' | 'neutral';
}> = [
  { id: 'deposit', label: 'واریز', Icon: Download, accent: 'success' },
  { id: 'withdraw', label: 'برداشت', Icon: Upload, accent: 'error' },
  { id: 'transfer', label: 'انتقال', Icon: Send, accent: 'brand' },
  { id: 'exchange', label: 'تبدیل ارز', Icon: ArrowLeftRight, accent: 'neutral' },
];

const CURRENCIES = ['AFN', 'USD', 'EUR', 'IRR'] as const;
type Currency = (typeof CURRENCIES)[number];

const CURRENCY_LABEL: Record<Currency, string> = {
  AFN: 'افغانی',
  USD: 'دلار',
  EUR: 'یورو',
  IRR: 'ریال',
};

function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function fmtAmount(cents: number, currency: string): string {
  const n = cents / 100;
  // AFN: عدد فارسی + " AFN" بعد از عدد (نه «ف» جلوی عدد)
  if (currency === 'AFN') {
    const formatted = new Intl.NumberFormat('fa-IR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true,
    }).format(n);
    return `${formatted} AFN`;
  }
  try {
    return new Intl.NumberFormat('fa-IR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${new Intl.NumberFormat('fa-IR').format(n)} ${currency}`;
  }
}

// ─── Main Component ────────────────────────────────────────────────────── //

export function TransferClient({ profile, accounts, initialAction, presetAccountId }: Props) {
  const initialTab: TabId = (['deposit', 'withdraw', 'transfer', 'exchange'] as const).includes(
    initialAction as TabId,
  )
    ? (initialAction as TabId)
    : 'deposit';

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [result, setResult] = useState<ResultState>(null);
  const formId = useId();

  // preset معتبر فقط اگر در لیست حساب‌های ACTIVE باشد
  const validPreset = useMemo(() => {
    if (!presetAccountId) return undefined;
    return accounts.find((a) => a.id === presetAccountId && a.status === 'ACTIVE')?.id;
  }, [presetAccountId, accounts]);

  // Reset result on tab change
  const handleTabChange = useCallback((id: TabId) => {
    setActiveTab(id);
    setResult(null);
  }, []);

  return (
    <div className={s.workspace}>
      {/* Tabs */}
      <nav className={s.tabBar} role="tablist" aria-label="نوع عملیات">
        {TABS.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`${formId}-tab-${t.id}`}
              aria-selected={isActive}
              aria-controls={`${formId}-panel-${t.id}`}
              onClick={() => handleTabChange(t.id)}
              className={`${s.tab} ${isActive ? s.tabActive : ''} ${s[`tab--${t.accent}`] ?? ''}`}
            >
              <t.Icon size={14} aria-hidden />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Result banner */}
      {result && (
        <div
          className={`${s.resultBanner} ${result.kind === 'success' ? s.resultSuccess : s.resultError}`}
          role={result.kind === 'success' ? 'status' : 'alert'}
        >
          {result.kind === 'success' ? (
            <CheckCircle2 size={18} aria-hidden />
          ) : (
            <AlertCircle size={18} aria-hidden />
          )}
          <div className={s.resultBody}>
            <p className={s.resultMessage}>{result.message}</p>
            {result.ref && (
              <p className={s.resultRef}>
                شماره پیگیری: <strong dir="ltr">{result.ref}</strong>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setResult(null)}
            className={s.resultClose}
            aria-label="بستن"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Panels */}
      <div
        id={`${formId}-panel-deposit`}
        role="tabpanel"
        aria-labelledby={`${formId}-tab-deposit`}
        hidden={activeTab !== 'deposit'}
      >
        {activeTab === 'deposit' && (
          <DepositForm
            accounts={accounts}
            onResult={setResult}
            kycApproved={profile.kycStatus === 'APPROVED'}
            presetAccountId={validPreset}
          />
        )}
      </div>
      <div
        id={`${formId}-panel-withdraw`}
        role="tabpanel"
        aria-labelledby={`${formId}-tab-withdraw`}
        hidden={activeTab !== 'withdraw'}
      >
        {activeTab === 'withdraw' && (
          <WithdrawForm accounts={accounts} onResult={setResult} presetAccountId={validPreset} />
        )}
      </div>
      <div
        id={`${formId}-panel-transfer`}
        role="tabpanel"
        aria-labelledby={`${formId}-tab-transfer`}
        hidden={activeTab !== 'transfer'}
      >
        {activeTab === 'transfer' && (
          <TransferForm accounts={accounts} onResult={setResult} presetAccountId={validPreset} />
        )}
      </div>
      <div
        id={`${formId}-panel-exchange`}
        role="tabpanel"
        aria-labelledby={`${formId}-tab-exchange`}
        hidden={activeTab !== 'exchange'}
      >
        {activeTab === 'exchange' && (
          <ExchangeForm accounts={accounts} onResult={setResult} presetAccountId={validPreset} />
        )}
      </div>
    </div>
  );
}

// ─── Shared: Account Select ────────────────────────────────────────────── //

function AccountSelect({
  value,
  onChange,
  accounts,
  name,
  id,
  label,
  filter,
}: {
  value: string;
  onChange: (id: string) => void;
  accounts: CustomerAccountDetail[];
  name: string;
  id: string;
  label: string;
  filter?: (a: CustomerAccountDetail) => boolean;
}) {
  const list = accounts.filter((a) => (filter ? filter(a) : true));
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      <Select value={value} onValueChange={onChange} dir="rtl">
        <SelectTrigger id={id} name={name} className={`${s.select} ${s.selectTrigger}`}>
          <SelectValue placeholder="— حسابی موجود نیست —" />
        </SelectTrigger>
        <SelectContent dir="rtl">
          {list.length === 0 && (
            <SelectItem value="__empty" disabled>
              — حسابی موجود نیست —
            </SelectItem>
          )}
          {list.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.currency} — {ACCOUNT_TYPE_LABEL[a.type] ?? a.type} (
              {fmtAmount(Math.round(a.balance * 100), a.currency)})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Shared: Amount Input ─────────────────────────────────────────────── //

function AmountInput({
  value,
  onChange,
  currency,
  id,
  label,
  min,
  max,
}: {
  value: string;
  onChange: (raw: string, cents: number) => void;
  currency: string;
  id: string;
  label: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.label}>
        {label}
        <span className={s.labelCurrency}>{currency}</span>
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className={s.input}
        value={value}
        dir="ltr"
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, '');
          onChange(raw, Math.round(Number(raw) * 100));
        }}
        placeholder="مثلاً ۵۰۰۰"
        autoComplete="off"
      />
      {min !== undefined && Number(value) < min && (
        <p className={s.fieldHint} data-tone="error">
          حداقل مبلغ {min} است
        </p>
      )}
      {max !== undefined && Number(value) > max && (
        <p className={s.fieldHint} data-tone="error">
          حداکثر مبلغ {max} است
        </p>
      )}
    </div>
  );
}

// ─── DEPOSIT Form ─────────────────────────────────────────────────────── //

function DepositForm({
  accounts,
  onResult,
  kycApproved,
  presetAccountId,
}: {
  accounts: CustomerAccountDetail[];
  onResult: (r: ResultState) => void;
  kycApproved: boolean;
  presetAccountId?: string;
}) {
  const activeAccounts = useMemo(() => accounts.filter((a) => a.status === 'ACTIVE'), [accounts]);
  const [accountId, setAccountId] = useState(
    presetAccountId && activeAccounts.some((a) => a.id === presetAccountId)
      ? presetAccountId
      : (activeAccounts[0]?.id ?? ''),
  );
  const [amount, setAmount] = useState('');
  const [cents, setCents] = useState(0);
  const [note, setNote] = useState('');
  const [isPending, startT] = useTransition();

  const account = activeAccounts.find((a) => a.id === accountId);
  const currency = account?.currency ?? 'AFN';
  const canSubmit = kycApproved && accountId && cents > 0;

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      startT(async () => {
        const res = await requestDeposit({
          amountCents: cents,
          currency,
          idempotencyKey: newIdempotencyKey(),
          note: note.trim() || undefined,
        });
        if (!res.success) {
          onResult({ kind: 'error', message: res.error.message });
          return;
        }
        const data: DepositResult = res.data;
        onResult({
          kind: 'success',
          message: `درخواست واریز ${fmtAmount(data.amountCents, data.currency)} ثبت شد. ${data.paymentInstructions ?? 'دستورالعمل پرداخت ارسال شد.'}`,
          ref: data.txnRef,
        });
        setAmount('');
        setCents(0);
        setNote('');
      });
    },
    [canSubmit, cents, currency, note, onResult],
  );

  if (!kycApproved) {
    return (
      <div className={s.gate} role="alert">
        <AlertCircle size={20} aria-hidden className={s.gateIcon} />
        <p className={s.gateTitle}>برای واریز، احراز هویت لازم است</p>
        <p className={s.gateDesc}>
          ابتدا احراز هویت خود را تکمیل کنید تا بتوانید واریز انجام دهید.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={s.form}>
      <AccountSelect
        id="dep-account"
        name="account"
        label="حساب مقصد"
        value={accountId}
        onChange={setAccountId}
        accounts={activeAccounts}
      />
      <AmountInput
        id="dep-amount"
        label="مبلغ واریز"
        value={amount}
        onChange={(raw, c) => {
          setAmount(raw);
          setCents(c);
        }}
        currency={currency}
        min={1}
      />
      <div className={s.field}>
        <label htmlFor="dep-note" className={s.label}>
          یادداشت (اختیاری)
        </label>
        <textarea
          id="dep-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={s.textarea}
          rows={2}
          maxLength={200}
          placeholder="مثلاً: واریز از حساب بانکی"
        />
      </div>
      <button type="submit" className={s.submit} disabled={!canSubmit || isPending}>
        {isPending ? 'در حال ثبت...' : 'ثبت درخواست واریز'}
      </button>
    </form>
  );
}

// ─── WITHDRAW Form ────────────────────────────────────────────────────── //

function WithdrawForm({
  accounts,
  onResult,
  presetAccountId,
}: {
  accounts: CustomerAccountDetail[];
  onResult: (r: ResultState) => void;
  presetAccountId?: string;
}) {
  const activeAccounts = useMemo(() => accounts.filter((a) => a.status === 'ACTIVE'), [accounts]);
  const [accountId, setAccountId] = useState(
    presetAccountId && activeAccounts.some((a) => a.id === presetAccountId)
      ? presetAccountId
      : (activeAccounts[0]?.id ?? ''),
  );
  const [amount, setAmount] = useState('');
  const [cents, setCents] = useState(0);
  const [dest, setDest] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pendingResult, setPendingResult] = useState<WithdrawResult | null>(null);
  const [isPending, startT] = useTransition();

  const account = activeAccounts.find((a) => a.id === accountId);
  const maxCents = account ? Math.round(account.balance * 100) : 0;
  const currency = account?.currency ?? 'AFN';
  const overBalance = cents > maxCents;

  const onSubmitStep1 = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!accountId || cents <= 0 || !dest.trim() || overBalance) return;
      startT(async () => {
        const res = await requestWithdraw({
          amountCents: cents,
          currency,
          destinationAccount: dest.trim(),
          idempotencyKey: newIdempotencyKey(),
        });
        if (!res.success) {
          onResult({ kind: 'error', message: res.error.message });
          return;
        }
        const data: WithdrawResult = res.data;
        setPendingResult(data);
        if (data.needsOtp) {
          setStep(2);
        } else {
          // confirm immediately
          const confirmRes = await confirmWithdraw({
            txnId: data.txnId,
            txnRef: data.txnRef,
          });
          if (!confirmRes.success) {
            onResult({ kind: 'error', message: confirmRes.error.message });
            return;
          }
          setStep(3);
          onResult({
            kind: 'success',
            message: `درخواست برداشت ${fmtAmount(cents, currency)} ثبت شد.`,
            ref: data.txnRef,
          });
        }
      });
    },
    [accountId, cents, currency, dest, overBalance, onResult],
  );

  const onSubmitStep2 = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!pendingResult) return;
      if (pendingResult.needsOtp && otp.length < 4) return;
      startT(async () => {
        const res = await confirmWithdraw({
          txnId: pendingResult.txnId,
          txnRef: pendingResult.txnRef,
          otp: pendingResult.needsOtp ? otp : undefined,
        });
        if (!res.success) {
          onResult({ kind: 'error', message: res.error.message });
          return;
        }
        setStep(3);
        onResult({
          kind: 'success',
          message: `برداشت ${fmtAmount(cents, currency)} تأیید شد.`,
          ref: pendingResult.txnRef,
        });
      });
    },
    [pendingResult, otp, cents, currency, onResult],
  );

  const reset = useCallback(() => {
    setStep(1);
    setPendingResult(null);
    setOtp('');
    setAmount('');
    setCents(0);
    setDest('');
  }, []);

  if (step === 3) {
    return (
      <output className={s.successState}>
        <CheckCircle2 size={32} aria-hidden className={s.successIcon} />
        <p className={s.successTitle}>برداشت ثبت شد</p>
        <button type="button" onClick={reset} className={s.outlineBtn}>
          برداشت جدید
        </button>
      </output>
    );
  }

  if (step === 2) {
    return (
      <form onSubmit={onSubmitStep2} className={s.form}>
        <p className={s.hint}>کد تأیید ۶ رقمی که به شماره/ایمیل شما ارسال شد را وارد کنید.</p>
        <div className={s.field}>
          <label htmlFor="wd-otp" className={s.label}>
            کد تأیید
          </label>
          <input
            id="wd-otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            className={s.input}
            value={otp}
            dir="ltr"
            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="000000"
            autoComplete="one-time-code"
          />
        </div>
        <button type="submit" className={s.submit} disabled={isPending || otp.length < 4}>
          {isPending ? 'در حال تأیید...' : 'تأیید برداشت'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmitStep1} className={s.form}>
      <AccountSelect
        id="wd-account"
        name="account"
        label="حساب مبدأ"
        value={accountId}
        onChange={(v) => {
          setAccountId(v);
          setCents(0);
          setAmount('');
        }}
        accounts={activeAccounts}
      />
      {account && (
        <p className={s.balanceHint}>
          موجودی قابل برداشت: <strong>{fmtAmount(maxCents, currency)}</strong>
        </p>
      )}
      <AmountInput
        id="wd-amount"
        label="مبلغ برداشت"
        value={amount}
        onChange={(raw, c) => {
          setAmount(raw);
          setCents(c);
        }}
        currency={currency}
        min={1}
        max={maxCents / 100}
      />
      <div className={s.field}>
        <label htmlFor="wd-dest" className={s.label}>
          شماره حساب / کارت مقصد
        </label>
        <input
          id="wd-dest"
          type="text"
          className={s.input}
          value={dest}
          dir="ltr"
          onChange={(e) => setDest(e.target.value)}
          placeholder="شماره حساب یا کارت بانکی"
          autoComplete="off"
        />
      </div>
      <button
        type="submit"
        className={s.submit}
        disabled={!accountId || cents <= 0 || !dest.trim() || overBalance || isPending}
      >
        {isPending ? 'در حال پردازش...' : 'درخواست برداشت'}
      </button>
    </form>
  );
}

// ─── TRANSFER Form (between own accounts) ─────────────────────────────── //

function TransferForm({
  accounts,
  onResult,
  presetAccountId,
}: {
  accounts: CustomerAccountDetail[];
  onResult: (r: ResultState) => void;
  presetAccountId?: string;
}) {
  const activeAccounts = useMemo(() => accounts.filter((a) => a.status === 'ACTIVE'), [accounts]);
  const [fromId, setFromId] = useState(
    presetAccountId && activeAccounts.some((a) => a.id === presetAccountId)
      ? presetAccountId
      : (activeAccounts[0]?.id ?? ''),
  );
  const [toId, setToId] = useState(() => {
    // اگر preset به‌عنوان from تنظیم شد، to = دومین حساب فعال
    if (presetAccountId && activeAccounts.length > 1) {
      const other = activeAccounts.find((a) => a.id !== presetAccountId);
      return other?.id ?? '';
    }
    return activeAccounts.length > 1 ? (activeAccounts[1]?.id ?? '') : '';
  });
  const [amount, setAmount] = useState('');
  const [cents, setCents] = useState(0);
  const [isPending, startT] = useTransition();

  const from = activeAccounts.find((a) => a.id === fromId);
  const maxCents = from ? Math.round(from.balance * 100) : 0;
  const overBalance = cents > maxCents;
  const sameAccount = fromId === toId && !!fromId;

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (sameAccount || overBalance || cents <= 0 || !fromId || !toId) {
        onResult({
          kind: 'error',
          message: 'لطفاً حساب‌ها و مبلغ معتبر انتخاب کنید',
        });
        return;
      }
      startT(async () => {
        const res = await transferBetweenAccounts({
          fromAccountId: fromId,
          toAccountId: toId,
          amountCents: cents,
          note: undefined,
          idempotencyKey: newIdempotencyKey(),
        });
        if (!res.success) {
          onResult({ kind: 'error', message: res.error.message });
          return;
        }
        const data: InternalTransferResult = res.data;
        onResult({
          kind: 'success',
          message: `انتقال ${fmtAmount(data.amountCents, data.currency)} با موفقیت انجام شد.`,
          ref: data.txnRef,
        });
        setAmount('');
        setCents(0);
      });
    },
    [sameAccount, overBalance, cents, fromId, toId, onResult],
  );

  if (activeAccounts.length < 2) {
    return (
      <output className={s.gate}>
        <CircleDollarSign size={20} aria-hidden className={s.gateIcon} />
        <p className={s.gateTitle}>حداقل دو حساب فعال نیاز دارید</p>
        <p className={s.gateDesc}>
          برای انتقال بین‌حسابی، باید حداقل دو حساب فعال داشته باشید. در حال حاضر{' '}
          {activeAccounts.length} حساب فعال دارید.
        </p>
      </output>
    );
  }

  return (
    <form onSubmit={onSubmit} className={s.form}>
      <div className={s.transferPair}>
        <AccountSelect
          id="tr-from"
          name="from"
          label="از حساب"
          value={fromId}
          onChange={setFromId}
          accounts={activeAccounts}
        />
        <span className={s.transferArrow} aria-hidden>
          <ArrowRight size={16} />
        </span>
        <AccountSelect
          id="tr-to"
          name="to"
          label="به حساب"
          value={toId}
          onChange={setToId}
          accounts={activeAccounts.filter((a) => a.id !== fromId)}
        />
      </div>
      {from && (
        <p className={s.balanceHint}>
          موجودی: <strong>{fmtAmount(maxCents, from.currency)}</strong>
        </p>
      )}
      <AmountInput
        id="tr-amount"
        label="مبلغ انتقال"
        value={amount}
        onChange={(raw, c) => {
          setAmount(raw);
          setCents(c);
        }}
        currency={from?.currency ?? 'AFN'}
        min={1}
        max={maxCents / 100}
      />
      <button
        type="submit"
        className={s.submit}
        disabled={sameAccount || overBalance || cents <= 0 || isPending}
      >
        {isPending ? 'در حال انتقال...' : 'انتقال'}
      </button>
    </form>
  );
}

// ─── EXCHANGE Form ────────────────────────────────────────────────────── //

function ExchangeForm({
  accounts,
  onResult,
  presetAccountId,
}: {
  accounts: CustomerAccountDetail[];
  onResult: (r: ResultState) => void;
  presetAccountId?: string;
}) {
  const activeAccounts = useMemo(() => accounts.filter((a) => a.status === 'ACTIVE'), [accounts]);
  // اگر preset تنظیم شد، ارز مبدأ = ارز آن حساب
  const presetAccount = useMemo(
    () => activeAccounts.find((a) => a.id === presetAccountId),
    [activeAccounts, presetAccountId],
  );
  const [fromCur, setFromCur] = useState<string>(
    presetAccount?.currency ?? activeAccounts[0]?.currency ?? 'AFN',
  );
  const [toCur, setToCur] = useState<string>('USD');
  const [amount, setAmount] = useState('');
  const [cents, setCents] = useState(0);
  const [isPending, startT] = useTransition();
  const [quote, setQuote] = useState<{ rate: number; feePercent: number } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const fromAccount = activeAccounts.find((a) => a.currency === fromCur);
  const maxCents = fromAccount ? Math.round(fromAccount.balance * 100) : 0;
  const overBalance = cents > maxCents;
  const sameCurrency = fromCur === toCur;

  // به‌روزرسانی نرخ
  useEffect(() => {
    if (sameCurrency) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    startT(async () => {
      const res = await getFxQuote({
        fromCurrency: fromCur as Currency,
        toCurrency: toCur as Currency,
      });
      if (cancelled) return;
      if (res.success && res.data) {
        setQuote({ rate: res.data.rate, feePercent: res.data.feePercent });
      } else {
        setQuote(null);
      }
      setQuoteLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fromCur, toCur, sameCurrency]);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (sameCurrency || overBalance || cents <= 0) return;
      startT(async () => {
        const res = await executeFxTrade({
          fromCurrency: fromCur,
          toCurrency: toCur,
          amountCents: cents,
          idempotencyKey: newIdempotencyKey(),
        });
        if (!res.success) {
          onResult({ kind: 'error', message: res.error.message });
          return;
        }
        const data = res.data;
        onResult({
          kind: 'success',
          message: `تبدیل ${fmtAmount(data.fromAmountCents, data.fromCurrency)} → ${fmtAmount(data.toAmountCents, data.toCurrency)} با موفقیت انجام شد.`,
          ref: data.txnId,
        });
        setAmount('');
        setCents(0);
      });
    },
    [sameCurrency, overBalance, cents, fromCur, toCur, onResult],
  );

  const previewOut =
    quote && cents > 0 ? Math.floor(cents * (1 - quote.feePercent / 100) * quote.rate) : 0;

  const currencyItems: CurrencyItem[] = useMemo(
    () => CURRENCIES.map((c) => ({ value: c, code: c, label: CURRENCY_LABEL[c] })),
    [],
  );
  const toItems = useMemo(
    () => currencyItems.filter((c) => c.value !== fromCur),
    [currencyItems, fromCur],
  );

  return (
    <form onSubmit={onSubmit} className={s.form}>
      <div className={s.currencyPair}>
        <div className={s.field}>
          {/* biome-ignore lint/a11y/noLabelWithoutControl: CurrencySelect uses its own ariaLabel */}
          <label className={s.label}>از ارز</label>
          <CurrencySelect
            items={currencyItems}
            value={fromCur}
            onChange={setFromCur}
            ariaLabel="ارز مبدأ"
            size="default"
          />
          {fromAccount && (
            <p className={s.balanceHint}>
              موجودی: <strong>{fmtAmount(maxCents, fromCur)}</strong>
            </p>
          )}
        </div>
        <div className={s.field}>
          {/* biome-ignore lint/a11y/noLabelWithoutControl: CurrencySelect uses its own ariaLabel */}
          <label className={s.label}>به ارز</label>
          <CurrencySelect
            items={toItems}
            value={toCur}
            onChange={setToCur}
            ariaLabel="ارز مقصد"
            size="default"
            disabled={sameCurrency}
          />
        </div>
      </div>
      <AmountInput
        id="fx-amount"
        label="مبلغ"
        value={amount}
        onChange={(raw, c) => {
          setAmount(raw);
          setCents(c);
        }}
        currency={fromCur}
        min={1}
        max={maxCents / 100}
      />
      {quote && !sameCurrency && (
        <div className={s.quoteBox} aria-live="polite">
          <div className={s.quoteRow}>
            <span>نرخ صرافی</span>
            <span dir="ltr">
              1 {fromCur} = {quote.rate.toFixed(4)} {toCur}
            </span>
          </div>
          <div className={s.quoteRow}>
            <span>کارمزد</span>
            <span>{quote.feePercent.toFixed(2)}٪</span>
          </div>
          {previewOut > 0 && (
            <div className={s.quoteRow} data-highlight>
              <span>دریافتی شما</span>
              <span className={s.quoteOut}>{fmtAmount(previewOut, toCur)}</span>
            </div>
          )}
        </div>
      )}
      {quoteLoading && <p className={s.hint}>در حال دریافت نرخ...</p>}
      <button
        type="submit"
        className={s.submit}
        disabled={sameCurrency || overBalance || cents <= 0 || isPending || !quote}
      >
        {isPending ? 'در حال تبدیل...' : 'تأیید تبدیل'}
      </button>
    </form>
  );
}
