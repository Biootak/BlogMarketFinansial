'use client';

/**
 * RequestForm — فرم یکپارچهٔ درخواست‌های مشتری به صرافی
 * ---------------------------------------------------------------------------
 * نوع درخواست (`type`) تعیین می‌کند کدام فیلدهای اضافی نمایش داده شوند.
 * submit → server action `createCustomerRequest` → redirect به لیست درخواست‌ها
 *
 * نکته: با تغییر type، فیلدهای قبلی reset می‌شوند تا کاربر اشتباه نکند.
 */

import {
  createCustomerRequest,
  type CustomerAccountDetail,
  type CustomerRequestType,
} from '@/actions/customer-portal';
import { Button } from '@/components/ui/button';
import { FormField, FormSection } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { CurrencySelect } from '@/components/ui/CurrencySelect';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Send, Sparkles, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import s from './RequestForm.module.css';

interface Props {
  initialType: CustomerRequestType;
  accounts: CustomerAccountDetail[];
  profileStatus: string;
}

const REQUEST_TYPES: Array<{ value: CustomerRequestType; label: string; desc: string; icon: string }> = [
  {
    value: 'ACCOUNT_NEW',
    label: 'باز کردن حساب جدید',
    desc: 'درخواست ارز، نوع حساب و برچسب',
    icon: 'wallet',
  },
  {
    value: 'TRANSFER_INITIATE',
    label: 'شروع انتقال',
    desc: 'مشخصات انتقال (مبدأ/مقصد/مبلغ)',
    icon: 'send',
  },
  {
    value: 'ACCOUNT_UNFREEZE',
    label: 'رفع مسدودی حساب',
    desc: 'درخواست بازگشایی حساب منجمد',
    icon: 'shield-check',
  },
  {
    value: 'LIMIT_INCREASE',
    label: 'افزایش سقف تراکنش',
    desc: 'درخواست بالا بردن limit روزانه',
    icon: 'gauge',
  },
  {
    value: 'OTHER',
    label: 'سایر',
    desc: 'توضیح کلی برای صرافی',
    icon: 'message',
  },
];

const ACCOUNT_TYPES = [
  { value: 'WALLET', label: 'کیف پول' },
  { value: 'SAVINGS', label: 'پس‌انداز' },
  { value: 'CHECKING', label: 'جاری' },
  { value: 'CURRENT', label: 'حساب فعلی' },
  { value: 'INVESTMENT', label: 'سرمایه‌گذاری' },
];

const CURRENCY_ITEMS = [
  { value: 'AFN', code: 'AFN', label: 'افغانی' },
  { value: 'USD', code: 'USD', label: 'دلار آمریکا' },
  { value: 'EUR', code: 'EUR', label: 'یورو' },
  { value: 'IRR', code: 'IRR', label: 'ریال ایران' },
  { value: 'GBP', code: 'GBP', label: 'پوند' },
  { value: 'PKR', code: 'PKR', label: 'روپیه پاکستان' },
];

export default function RequestForm({ initialType, accounts, profileStatus }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [type, setType] = useState<CustomerRequestType>(initialType);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Dynamic payload fields
  const [accountType, setAccountType] = useState('WALLET');
  const [accountLabel, setAccountLabel] = useState('');
  const [currency, setCurrency] = useState('AFN');
  const [fromAccount, setFromAccount] = useState(accounts[0]?.id ?? '');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [unfreezeAccount, setUnfreezeAccount] = useState(
    accounts.find((a) => a.status === 'FROZEN')?.id ?? '',
  );
  const [requestedLimit, setRequestedLimit] = useState('');

  const isFrozen = profileStatus === 'FROZEN' || profileStatus === 'CLOSED';

  function handleTypeChange(next: CustomerRequestType) {
    setType(next);
    setError(null);
  }

  function buildPayload(): Record<string, string | number> {
    switch (type) {
      case 'ACCOUNT_NEW':
        return {
          accountType,
          currency,
          label: accountLabel || '(بدون برچسب)',
        };
      case 'TRANSFER_INITIATE':
        return {
          fromAccountId: fromAccount,
          toAccountId: toAccount,
          amount: Number(amount) || 0,
          currency: accounts.find((a) => a.id === fromAccount)?.currency ?? '',
        };
      case 'ACCOUNT_UNFREEZE':
        return { accountId: unfreezeAccount };
      case 'LIMIT_INCREASE':
        return { requestedLimitAf: Number(requestedLimit) || 0 };
      case 'OTHER':
        return {};
      default:
        return {};
    }
  }

  function validate(): string | null {
    if (isFrozen) {
      return 'حساب شما در وضعیت فعلی اجازهٔ ارسال درخواست ندارد. با پشتیبانی تماس بگیرید.';
    }
    if (!note.trim() && type === 'OTHER') {
      return 'برای درخواست «سایر»، توضیح الزامی است';
    }
    if (type === 'TRANSFER_INITIATE') {
      if (!fromAccount || !toAccount) return 'انتخاب مبدأ و مقصد الزامی است';
      if (fromAccount === toAccount) return 'مبدأ و مقصد نمی‌توانند یکسان باشند';
      if (!amount || Number(amount) <= 0) return 'مبلغ باید بزرگ‌تر از صفر باشد';
    }
    if (type === 'ACCOUNT_UNFREEZE' && !unfreezeAccount) {
      return 'انتخاب حساب منجمد الزامی است';
    }
    if (type === 'LIMIT_INCREASE') {
      const v = Number(requestedLimit);
      if (!v || v <= 0) return 'سقف درخواستی باید بزرگ‌تر از صفر باشد';
    }
    return null;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createCustomerRequest({
        type,
        note: note.trim() || undefined,
        payload: buildPayload(),
      });
      if (!res.success) {
        setError(res.error ?? 'خطا در ثبت درخواست');
        toast({ variant: 'destructive', title: res.error ?? 'خطا در ثبت درخواست' });
        return;
      }
      toast({
        title: 'درخواست شما ثبت شد',
        description: res.trackingCode
          ? `کد پیگیری ${res.trackingCode} — صرافی به‌زودی پاسخ می‌دهد.`
          : 'صرافی به‌زودی پاسخ می‌دهد.',
      });
      // به صفحهٔ لیست درخواست‌ها هدایت شود (source-of-truth)
      // نه notifications (که فقط تأییدیه است)
      router.push(res.requestId ? `/customer/requests/${res.requestId}` : '/customer/requests');
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className={s.form} aria-label="فرم درخواست جدید">
      <FormSection title="نوع درخواست" description="یکی از انواع زیر را انتخاب کنید">
        <FormField label="نوع" htmlFor="req-type">
          <Select value={type} onValueChange={(v) => handleTypeChange(v as CustomerRequestType)}>
            <SelectTrigger id="req-type" className={s.select}>
              <SelectValue placeholder="انتخاب کنید" />
            </SelectTrigger>
            <SelectContent>
              {REQUEST_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <div className={s.option}>
                    <span className={s.optionLabel}>{t.label}</span>
                    <span className={s.optionDesc}>{t.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {/* Request type hint cards */}
        <div className={s.typeCards} role="list">
          {REQUEST_TYPES.map((t) => {
            const Icon =
              t.icon === 'wallet' ? Wallet : t.icon === 'send' ? Send : Sparkles;
            return (
              <button
                type="button"
                key={t.value}
                role="listitem"
                data-active={type === t.value ? 'true' : undefined}
                onClick={() => handleTypeChange(t.value)}
                className={s.typeCard}
                aria-pressed={type === t.value}
              >
                <span className={s.typeCardIcon} aria-hidden>
                  <Icon size={14} />
                </span>
                <span className={s.typeCardLabel}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </FormSection>

      {/* ─── Dynamic fields per type ─── */}
      {type === 'ACCOUNT_NEW' && (
        <FormSection title="مشخصات حساب" description="نوع حساب، ارز و برچسب دلخواه">
          <div className={s.grid2}>
            <FormField label="نوع حساب" htmlFor="acc-type">
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger id="acc-type" className={s.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="ارز" htmlFor="acc-currency">
              <CurrencySelect
                id="acc-currency"
                value={currency}
                onChange={setCurrency}
                currencies={CURRENCY_ITEMS}
              />
            </FormField>
          </div>

          <FormField
            label="برچسب (اختیاری)"
            htmlFor="acc-label"
            helper="مثلاً: حساب شخصی، حساب کسب‌وکار"
          >
            <Input
              id="acc-label"
              value={accountLabel}
              onChange={(e) => setAccountLabel(e.target.value)}
              placeholder="مثلاً: حساب شخصی"
              maxLength={40}
            />
          </FormField>
        </FormSection>
      )}

      {type === 'TRANSFER_INITIATE' && (
        <FormSection title="جزئیات انتقال" description="از کدام حساب، به کجا، چه مبلغ">
          <FormField label="از حساب" htmlFor="t-from" required>
            <Select value={fromAccount} onValueChange={setFromAccount}>
              <SelectTrigger id="t-from" className={s.select}>
                <SelectValue placeholder="انتخاب حساب مبدأ" />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter((a) => a.status === 'ACTIVE')
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.type} · {a.currency} · {a.balance.toLocaleString('fa-IR')}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="به (شناسه مقصد)" htmlFor="t-to" required helper="مثلاً شماره حساب، IBAN، یا ID مقصد">
            <Input
              id="t-to"
              value={toAccount}
              onChange={(e) => setToAccount(e.target.value)}
              placeholder="ACCT-XXX یا شماره حساب"
            />
          </FormField>

          <FormField label="مبلغ" htmlFor="t-amount" required>
            <Input
              id="t-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="مثلاً: 5000"
              dir="ltr"
            />
          </FormField>
        </FormSection>
      )}

      {type === 'ACCOUNT_UNFREEZE' && (
        <FormSection title="انتخاب حساب منجمد" description="صرافی پس از بررسی حساب را باز می‌کند">
          <FormField label="حساب منجمد" htmlFor="u-acc" required>
            <Select value={unfreezeAccount} onValueChange={setUnfreezeAccount}>
              <SelectTrigger id="u-acc" className={s.select}>
                <SelectValue placeholder="انتخاب حساب" />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter((a) => a.status === 'FROZEN')
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.type} · {a.currency} · {a.label ?? '(بدون برچسب)'}
                    </SelectItem>
                  ))}
                {accounts.filter((a) => a.status === 'FROZEN').length === 0 && (
                  <SelectItem value="__none" disabled>
                    حساب منجمدی ندارید
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>
      )}

      {type === 'LIMIT_INCREASE' && (
        <FormSection title="سقف درخواستی" description="پیشنهاد شما برای limit روزانه (AFN)">
          <FormField label="سقف روزانه پیشنهادی" htmlFor="lim-amount" required>
            <Input
              id="lim-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={requestedLimit}
              onChange={(e) => setRequestedLimit(e.target.value)}
              placeholder="مثلاً: 1000000"
              dir="ltr"
            />
          </FormField>
        </FormSection>
      )}

      {/* ─── Note (common) ─── */}
      <FormSection title="توضیحات" description="هر اطلاعات اضافی که صرافی باید بداند">
        <FormField
          label="یادداشت (اختیاری)"
          htmlFor="note"
          helper={`${note.length} / ۵۰۰ کاراکتر`}
        >
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="مثلاً: لطفاً زودتر بررسی شود. با تشکر"
            rows={4}
            maxLength={500}
          />
        </FormField>
      </FormSection>

      {/* ─── Error / Submit ─── */}
      {error && (
        <div className={s.errorBox} role="alert">
          {error}
        </div>
      )}

      <div className={s.actions}>
        <Button type="submit" disabled={pending} className={s.submit}>
          {pending ? (
            <>
              <Loader2 size={14} className={s.spinner} aria-hidden />
              در حال ارسال...
            </>
          ) : (
            <>
              <Send size={14} aria-hidden />
              ثبت درخواست
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/customer/accounts')}
          disabled={pending}
        >
          انصراف
        </Button>
      </div>
    </form>
  );
}
