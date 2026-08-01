'use client';

/**
 * CheckoutClient — فرم پرداخت پلن اشتراک.
 *
 * 2026-08-01: جریان checkout که قبلاً به 404 می‌خورد حالا به server action
 * واقعی `changePlan` متصل است — SubscriptionEvent + audit log + idempotency
 * + rate-limit. سه روش پرداخت (کارت / انتقال بانکی / رمزارز) ارائه می‌دهد.
 */

import { changePlan } from '@/actions/subscription';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Banknote, CreditCard, Landmark, Loader2, Lock, ShieldCheck, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import s from './checkout.module.css';

type PaymentMethod = 'CARD' | 'BANK_TRANSFER' | 'CRYPTO';

const PAY_METHODS: Array<{
  value: PaymentMethod;
  label: string;
  desc: string;
  icon: typeof CreditCard;
}> = [
  { value: 'CARD', label: 'کارت بانکی', desc: 'پرداخت آنی با درگاه امن', icon: CreditCard },
  { value: 'BANK_TRANSFER', label: 'انتقال بانکی', desc: 'واریز به حساب اعلامی', icon: Landmark },
  { value: 'CRYPTO', label: 'رمز ارز', desc: 'پرداخت با USDT / TRX', icon: Wallet },
];

interface Props {
  planId: 'free' | 'pro' | 'business';
  planName: string;
  billing: 'monthly' | 'yearly';
  priceDisplay: string;
  currency: string;
  userEmail: string;
}

export function CheckoutClient({
  planId,
  planName,
  billing,
  priceDisplay,
  currency,
  userEmail,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState<PaymentMethod>('CARD');

  const handlePay = () => {
    startTransition(async () => {
      const res = await changePlan({
        planId,
        billingCycle: billing,
        paymentMethod: method,
      });
      if (!res.success) {
        toast({
          title: 'خطا در پرداخت',
          description: res.error.message,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'پلن با موفقیت فعال شد',
        description: `فاکتور ${res.data.invoiceNo} — پلن ${planName}`,
      });
      // کاربر به داشبورد اشتراک می‌رود تا فاکتور و تاریخچه را ببیند
      router.push('/dashboard/subscription');
    });
  };

  return (
    <div className={s.form}>
      {/* ── Payment method ── */}
      <fieldset className={s.methods} aria-label="روش پرداخت">
        <legend className={s.legend}>روش پرداخت</legend>
        <div className={s.methodGrid}>
          {PAY_METHODS.map((m) => {
            const Icon = m.icon;
            const active = method === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className={`${s.method} ${active ? s.methodActive : ''}`}
                aria-pressed={active}
              >
                <span className={s.methodIcon} aria-hidden>
                  <Icon size={16} />
                </span>
                <span className={s.methodText}>
                  <span className={s.methodLabel}>{m.label}</span>
                  <span className={s.methodDesc}>{m.desc}</span>
                </span>
                <span className={s.methodRadio} aria-hidden>
                  <span className={s.methodRadioCore} />
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* ── Bank card fields (CARD only) ── */}
      {method === 'CARD' && (
        <div className={s.cardFields}>
          <div className={s.field}>
            <label className={s.fieldLabel} htmlFor="cc-num">
              شماره کارت
            </label>
            <input
              id="cc-num"
              className={s.input}
              dir="ltr"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="0000 0000 0000 0000"
            />
          </div>
          <div className={s.fieldRow}>
            <div className={s.field}>
              <label className={s.fieldLabel} htmlFor="cc-exp">
                انقضا
              </label>
              <input
                id="cc-exp"
                className={s.input}
                dir="ltr"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
              />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel} htmlFor="cc-cvc">
                CVV2
              </label>
              <input
                id="cc-cvc"
                className={s.input}
                dir="ltr"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                maxLength={4}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Bank transfer info ── */}
      {method === 'BANK_TRANSFER' && (
        <div className={s.infoBox} role="note">
          <Banknote size={15} className={s.infoIcon} aria-hidden />
          <p className={s.infoText}>
            پس از ثبت درخواست، شماره‌حساب برای واریز در فاکتور شما نمایش داده می‌شود. پلن پس از تأیید
            واریز فعال می‌شود.
          </p>
        </div>
      )}

      {/* ── Crypto info ── */}
      {method === 'CRYPTO' && (
        <div className={s.infoBox} role="note">
          <Wallet size={15} className={s.infoIcon} aria-hidden />
          <p className={s.infoText}>
            پس از ثبت درخواست، آدرس کیف پول برای پرداخت USDT/TRX نمایش داده می‌شود. پلن پس از تأیید
            شبکه فعال می‌شود.
          </p>
        </div>
      )}

      {/* ── Summary footer ── */}
      <div className={s.foot}>
        <div className={s.footRow}>
          <span className={s.footLabel}>ایمیل فاکتور</span>
          <span className={s.footEmail} dir="ltr">
            {userEmail || '—'}
          </span>
        </div>
        <div className={s.footRow}>
          <span className={s.footLabel}>مبلغ</span>
          <span className={s.footPrice}>
            {priceDisplay} <span className={s.footUnit}>{currency}</span>
          </span>
        </div>
      </div>

      {/* ── Submit ── */}
      <Button
        type="button"
        onClick={handlePay}
        disabled={pending}
        className={s.submit}
        aria-busy={pending || undefined}
      >
        {pending ? (
          <Loader2 size={16} className={s.spinner} aria-hidden />
        ) : (
          <Lock size={15} aria-hidden />
        )}
        {pending ? 'در حال پرداخت…' : 'پرداخت و فعال‌سازی پلن'}
      </Button>

      <p className={s.secure}>
        <ShieldCheck size={13} aria-hidden />
        پرداخت امن · ۷ روز ضمانت بازگشت وجه · لغو در هر زمان
      </p>
    </div>
  );
}
