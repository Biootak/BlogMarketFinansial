'use client';

/**
 * DealModal — فرم ثبت معامله ارزی
 * مشتری صرافی و ارز را انتخاب کرده، اینجا مبلغ و اطلاعات تماس می‌دهد.
 *
 * از Radix Dialog primitive مستقیم استفاده می‌شود (نه shadcn wrapper)
 * تا CSS Module کنترل کامل layout/style داشته باشد.
 */

import { createDeal } from '@/actions/currency-deals';
import type { QuoteRow } from '@/actions/exchange-quotes';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import s from './DealModal.module.css';

interface Props {
  quote: QuoteRow;
  open: boolean;
  onClose: () => void;
}

const UNIT_LABEL: Record<string, string> = {
  toman: 'تومان',
  rial: 'ریال',
  afn: 'افغانی',
  usd: 'دلار',
};

function formatFa(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '—';
  return new Intl.NumberFormat('fa-IR').format(Math.round(n));
}

type FormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; trackingCode: string };

async function submitAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const quoteId = formData.get('quoteId') as string;
  const exchangeId = formData.get('exchangeId') as string;
  const fromCurrency = formData.get('fromCurrency') as string;
  const toCurrency = formData.get('toCurrency') as string;
  const fromAmount = Number.parseFloat(formData.get('fromAmount') as string);
  const customerName = formData.get('customerName') as string;
  const customerPhone = formData.get('customerPhone') as string;
  const customerEmail = (formData.get('customerEmail') as string) || null;
  const channel = (formData.get('channel') as 'ONLINE' | 'INPERSON' | 'PHONE') ?? 'ONLINE';
  const note = (formData.get('note') as string) || null;

  const res = await createDeal({
    exchangeId,
    quoteId: quoteId || null,
    customerName,
    customerPhone,
    customerEmail,
    fromCurrency,
    toCurrency,
    fromAmount,
    channel,
    note,
    // idempotencyKey باید deterministic باشد — بدون Date.now()
    // برای یک session: quoteId + phone + amount کافی است
    idempotencyKey: `deal-${quoteId}-${customerPhone}-${fromAmount}`,
  });

  if (!res.success) return { status: 'error', message: res.error.message };
  return { status: 'success', trackingCode: res.data.trackingCode };
}

export default function DealModal({ quote, open, onClose }: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<FormState, FormData>(submitAction, {
    status: 'idle',
  });

  const buy = Number.parseFloat(quote.buyRate);
  const unit = UNIT_LABEL[quote.unit] ?? quote.unit;
  const minAmount = quote.minAmount ? Number.parseFloat(quote.minAmount) : 1;

  // پس از success — redirect به tracking
  useEffect(() => {
    if (state.status === 'success') {
      const timer = setTimeout(() => {
        router.push(`/track/${state.trackingCode}`);
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, router, onClose]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay className={s.overlay} />

        {/* Content — Radix primitive مستقیم: بدون shadcn default classes */}
        <DialogPrimitive.Content className={s.content} aria-describedby={undefined}>
          {/* Header */}
          <div className={s.dialogHeader}>
            <DialogPrimitive.Title className={s.dialogTitle}>ثبت معامله</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <button type="button" className={s.closeBtn} aria-label="بستن">
                <X className="w-4 h-4" aria-hidden />
              </button>
            </DialogPrimitive.Close>
          </div>

          {/* Quote summary */}
          <div className={s.quoteSummary}>
            <span className={s.summaryExchange}>{quote.exchangeName ?? 'صرافی'}</span>
            <span className={s.summaryCurrency}>{quote.currencyCode}</span>
            <span className={`${s.summaryRate} tabular-nums`}>
              نرخ خرید: {formatFa(buy)} {unit}
            </span>
            {quote.exchangeCity && <span className={s.summaryCity}>{quote.exchangeCity}</span>}
          </div>

          {/* Success state */}
          {state.status === 'success' && (
            <output className={s.successBox}>
              <div className={s.successIcon} aria-hidden>
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <p className={s.successMsg}>معامله ثبت شد!</p>
              <p className={s.successCode}>کد پیگیری: {state.trackingCode}</p>
              <p className={s.successHint}>در حال انتقال به صفحه پیگیری…</p>
            </output>
          )}

          {/* Form */}
          {state.status !== 'success' && (
            <form action={formAction} className={s.form} noValidate>
              <input type="hidden" name="exchangeId" value={quote.exchangeId} />
              <input type="hidden" name="quoteId" value={quote.id} />
              <input type="hidden" name="fromCurrency" value={quote.currencyCode} />
              <input type="hidden" name="toCurrency" value={quote.unit === 'afn' ? 'AFN' : 'IRR'} />

              {state.status === 'error' && (
                <div className={s.errorBox} role="alert">
                  {state.message}
                </div>
              )}

              <div className={s.field}>
                <label className={s.label} htmlFor="dm-amount">
                  مبلغ ({quote.currencyCode})
                </label>
                <input
                  id="dm-amount"
                  name="fromAmount"
                  type="number"
                  className={s.input}
                  min={minAmount}
                  step="any"
                  placeholder={`حداقل ${formatFa(minAmount)} ${quote.currencyCode}`}
                  required
                  dir="ltr"
                />
              </div>

              <div className={s.field}>
                <label className={s.label} htmlFor="dm-name">
                  نام و نام خانوادگی
                </label>
                <input
                  id="dm-name"
                  name="customerName"
                  type="text"
                  className={s.input}
                  placeholder="نام کامل خود را وارد کنید"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>

              <div className={s.field}>
                <label className={s.label} htmlFor="dm-phone">
                  شماره تماس
                </label>
                <input
                  id="dm-phone"
                  name="customerPhone"
                  type="tel"
                  className={s.input}
                  placeholder="مثال: 0912xxxxxxx"
                  required
                  minLength={7}
                  maxLength={20}
                  dir="ltr"
                />
              </div>

              <div className={s.field}>
                <label className={s.label} htmlFor="dm-channel">
                  نوع معامله
                </label>
                <select id="dm-channel" name="channel" className={s.select} defaultValue="ONLINE">
                  <option value="ONLINE">آنلاین</option>
                  <option value="INPERSON">حضوری</option>
                  <option value="PHONE">تلفنی</option>
                </select>
              </div>

              <div className={s.field}>
                <label className={s.label} htmlFor="dm-note">
                  یادداشت (اختیاری)
                </label>
                <textarea
                  id="dm-note"
                  name="note"
                  className={s.textarea}
                  placeholder="توضیحات اضافه…"
                  maxLength={500}
                  rows={2}
                />
              </div>

              <button
                type="submit"
                className={s.submitBtn}
                disabled={isPending}
                aria-busy={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    در حال ثبت…
                  </>
                ) : (
                  'ثبت معامله'
                )}
              </button>

              <p className={s.disclaimer}>
                با ثبت معامله، شرایط صرافی را پذیرفته‌اید. کد پیگیری برای پیگیری وضعیت الزامی است.
              </p>
            </form>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
