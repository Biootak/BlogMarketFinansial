'use client';

import TransferRequestForm, {
  type ServiceTypeKey,
} from '@/components/money-transfer/TransferRequestForm';
/**
 * ServiceOrderCheckout — جریان یکپارچه «ثبت سفارش» (2026-08-16 rebuild)
 * ─────────────────────────────────────────────────────────────────────────────
 * الگو: Stripe Checkout — فرم + «Order Ticket» (رسید زنده) در ریل کناری.
 *
 *  - تیکت با لبهٔ پروانه‌ای (CSS mask) + ارقام tabular-nums که زنده آپدیت می‌شوند
 *  - دکمهٔ ثبت سفارش داخل خود تیکت (الگوی right-rail استرایپ) — از طریق
 *    CustomEvent ('mt:submit-request') فرم را submit می‌کند، بدون prop-drilling
 *  - استریک نرخ زندهٔ بازار زیر هدر (دادهٔ سرور — snapshot واقعی)
 *  - موبایل: تیکت به نوار چسبان پایین با مجموع + دکمه تبدیل می‌شود
 *
 * همگامی از طریق CustomEvent ('mt:form-sync') — فرم منتشر می‌کند، تیکت شنونده است.
 */
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaTelegram, FaWhatsapp } from 'react-icons/fa';
import s from './ServiceOrderCheckout.module.css';

const SYNC_EVENT = 'mt:form-sync';

interface OrderSyncPayload {
  service: ServiceTypeKey;
  serviceLabel: string;
  step: number;
  amount: string;
  currency: string;
  currencyLabel: string;
  destination: string;
  destinationLabel: string;
  urgency: 'NORMAL' | 'URGENT';
  success: boolean;
  trackingCode: string;
  /** 2026-08-16 — ارقام واقعی quote */
  quoteAvailable: boolean;
  rate: number | null;
  feeAf: number | null;
  totalAf: number | null;
  paymentMethodLabel: string;
  partnerExchange: string | null;
}

export interface MarketRateStrip {
  code: string;
  label: string;
  rate: number;
  changePercent: number;
}

interface Props {
  initialService: string | null;
  initialAmount?: string;
  initialCurrency?: string;
  telegramLink?: string | null;
  whatsappLink?: string | null;
  /** نرخ‌های زندهٔ بازار (سرور — snapshot واقعی) */
  marketRates: MarketRateStrip[];
  /** صرافی‌های همکار هر سرویس — routing بازارچه */
  exchangeOptions?: Record<string, Array<{ id: string; name: string }>>;
}

const afFmt = new Intl.NumberFormat('fa-AF', { maximumFractionDigits: 2 });

// ─── Market Strip — استریک نرخ زنده زیر هدر (دادهٔ SSR) ──────────────────── //
function MarketStrip({ rates }: { rates: MarketRateStrip[] }) {
  if (rates.length === 0) return null;
  return (
    <div className={s.marketStrip} role="status" aria-label="نرخ‌های زنده بازار">
      <span className={s.marketStripDot} aria-hidden="true" />
      {rates.map((r) => (
        <span key={r.code} className={s.marketItem}>
          <span className={s.marketCode}>{r.label}</span>
          <span className={s.marketRate} dir="ltr">
            {afFmt.format(r.rate)}
          </span>
          <span
            className={`${s.marketChange} ${r.changePercent >= 0 ? s.marketUp : s.marketDown}`}
            dir="ltr"
          >
            {r.changePercent >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {new Intl.NumberFormat('fa-AF', { maximumFractionDigits: 1 }).format(
              Math.abs(r.changePercent),
            )}
            ٪
          </span>
        </span>
      ))}
    </div>
  );
}

// ─── Order Ticket — رسید زنده با CTA (الگوی right-rail استرایپ) ────────────── //
function OrderTicket({
  telegramLink,
  whatsappLink,
}: {
  telegramLink?: string | null;
  whatsappLink?: string | null;
}) {
  const [payload, setPayload] = useState<OrderSyncPayload | null>(null);

  useEffect(() => {
    const onSync = (e: Event) => {
      setPayload((e as CustomEvent<OrderSyncPayload>).detail);
    };
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);

  const submitFromTicket = () => {
    window.dispatchEvent(new CustomEvent('mt:submit-request'));
  };

  // بدون انتخاب → empty state
  if (!payload || payload.step === 0) {
    return (
      <aside className={s.ticket} aria-label="تیکت سفارش">
        <div className={s.ticketHead}>
          <h3 className={s.ticketTitle}>تیکت سفارش</h3>
          <span className={s.ticketBadge} aria-hidden="true">
            <Sparkles size={13} />
          </span>
        </div>
        <div className={s.ticketEmpty}>
          <p className={s.emptyText}>هنوز سرویسی انتخاب نشده است.</p>
          <p className={s.emptyHint}>
            سرویس را از فرم کنار انتخاب کنید — نرخ لحظه‌ای و مجموع قابل پرداخت همین‌جا قفل می‌شود.
          </p>
        </div>
        <ul className={s.ticketMeta}>
          <li>
            <Clock3 size={13} aria-hidden="true" />
            پاسخ کارشناس — عادی تا ۲ ساعت، فوری تا ۳۰ دقیقه
          </li>
          <li>
            <Lock size={13} aria-hidden="true" />
            نرخ لحظه‌ای بازار با قفل ۱۰ دقیقه‌ای
          </li>
          <li>
            <ShieldCheck size={13} aria-hidden="true" />
            کارمزد شفاف — بدون هزینهٔ پنهان
          </li>
        </ul>
      </aside>
    );
  }

  // موفقیت → کد پیگیری
  if (payload.success && payload.trackingCode) {
    return (
      <aside className={s.ticket} aria-label="تیکت سفارش">
        <div className={s.ticketHead}>
          <h3 className={s.ticketTitle}>تیکت سفارش</h3>
          <span className={s.ticketBadgeSuccess} aria-hidden="true">
            <BadgeCheck size={13} />
          </span>
        </div>
        <div className={s.ticketSuccessBlock}>
          <p className={s.successTitle}>سفارش ثبت شد</p>
          <p className={s.successCode} dir="ltr">
            {payload.trackingCode}
          </p>
          <p className={s.successHint}>کد پیگیری برای پیگیری وضعیت نگه دارید.</p>
          <Link href={`/track/${payload.trackingCode}`} className={s.successTrackLink}>
            مشاهده وضعیت ←
          </Link>
        </div>
      </aside>
    );
  }

  const showQuote = payload.quoteAvailable && payload.step === 2;

  return (
    <aside className={s.ticket} aria-label="تیکت سفارش">
      <div className={`${s.ticketHead} ${showQuote ? s.ticketHeadLocked : ''}`}>
        <h3 className={s.ticketTitle}>تیکت سفارش</h3>
        {showQuote && (
          <span className={s.lockPill}>
            <Lock size={11} aria-hidden="true" />
            نرخ قفل شد
          </span>
        )}
      </div>

      {/* سرویس */}
      <div className={s.ticketService}>
        <div>
          <p className={s.serviceLabel}>{payload.serviceLabel}</p>
          {payload.partnerExchange && (
            <p className={s.serviceSub}>انجام توسط {payload.partnerExchange}</p>
          )}
          {!payload.partnerExchange && payload.step === 2 && (
            <p className={s.serviceSub}>ارائهٔ مستقیم پلتفرم</p>
          )}
        </div>
      </div>

      {/* مبلغ — tabular-nums، پالس ظریف هنگام تغییر */}
      <div className={s.amountBlock}>
        {payload.amount ? (
          <p key={payload.amount} className={`${s.amount} anim-fade-in-up`} dir="ltr">
            {payload.amount}
            <span className={s.amountCurrency}>{payload.currencyLabel}</span>
          </p>
        ) : (
          <p className={s.amountPlaceholder}>مبلغ را وارد کنید</p>
        )}
      </div>

      {/* تفکیک قیمت زنده */}
      {showQuote && (
        <div className={s.ticketBreakdown}>
          {payload.rate != null && (
            <div className={s.breakRow}>
              <span>نرخ بازار</span>
              <span dir="ltr">{afFmt.format(payload.rate)} افغانی</span>
            </div>
          )}
          {payload.feeAf != null && (
            <div className={s.breakRow}>
              <span>کارمزد</span>
              <span dir="ltr">{new Intl.NumberFormat('fa-AF').format(payload.feeAf)} افغانی</span>
            </div>
          )}
          {payload.totalAf != null && (
            <div className={`${s.breakRow} ${s.breakRowTotal}`}>
              <span>{payload.urgency === 'URGENT' ? 'فوری · قابل پرداخت' : 'قابل پرداخت'}</span>
              <span dir="ltr" key={payload.totalAf} className={s.breakTotalVal}>
                <span className="anim-fade-in-up">
                  {new Intl.NumberFormat('fa-AF').format(payload.totalAf)} افغانی
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* جزئیات */}
      {(payload.destinationLabel || payload.urgency === 'URGENT') && !showQuote && (
        <dl className={s.summaryRows}>
          {payload.destinationLabel && (
            <div className={s.summaryRow}>
              <dt>مقصد</dt>
              <dd>{payload.destinationLabel}</dd>
            </div>
          )}
          {payload.urgency === 'URGENT' && (
            <div className={s.summaryRow}>
              <dt>سرعت</dt>
              <dd>
                <span className={s.urgentBadge}>فوری</span>
              </dd>
            </div>
          )}
        </dl>
      )}

      {showQuote && payload.paymentMethodLabel && (
        <div className={s.payMethodRow}>
          <ShieldCheck size={13} aria-hidden="true" />
          تسویه: {payload.paymentMethodLabel}
        </div>
      )}

      {/* خط پارگی بلیت + CTA — الگوی right-rail استرایپ (فقط مرحلهٔ نهایی) */}
      <div className={s.ticketTear}>
        <span className={s.ticketNotchEnd} aria-hidden="true" />
        {payload.step === 2 ? (
          <button type="button" className={s.ticketCta} onClick={submitFromTicket}>
            {showQuote && payload.totalAf != null ? (
              <span>
                تأیید و پرداخت{' '}
                <strong dir="ltr">{new Intl.NumberFormat('fa-AF').format(payload.totalAf)}</strong>{' '}
                افغانی
              </span>
            ) : (
              <span>تأیید و ثبت سفارش</span>
            )}
          </button>
        ) : (
          <p className={s.ticketHint}>
            <ShieldCheck size={13} aria-hidden="true" />
            در مرحلهٔ بعد نرخ لحظه‌ای قفل می‌شود — بدون پیش‌پرداخت.
          </p>
        )}
      </div>

      {(telegramLink || whatsappLink) && (
        <div className={s.contactRow}>
          {telegramLink && (
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className={s.contactBtn}
            >
              <FaTelegram size={13} aria-hidden="true" />
              تلگرام
            </a>
          )}
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className={s.contactBtn}
            >
              <FaWhatsapp size={13} aria-hidden="true" />
              واتساپ
            </a>
          )}
        </div>
      )}
    </aside>
  );
}

// ─── Checkout page ─────────────────────────────────────────────────────────── //
export default function ServiceOrderCheckout({
  initialService,
  initialAmount,
  initialCurrency,
  telegramLink,
  whatsappLink,
  marketRates,
  exchangeOptions,
}: Props) {
  const validInitial = (
    [
      'INTERNATIONAL_TRANSFER',
      'CURRENCY_BUY',
      'CURRENCY_SELL',
      'CRYPTO_BUY',
      'CRYPTO_SELL',
      'PAYPAL_TRANSFER',
      'ONLINE_PAYMENT',
      'TUITION_PAYMENT',
      'FREELANCE_INCOME',
      'SOFTWARE_PURCHASE',
      'GIFT_CARD',
      'MOBILE_TOPUP',
      'BILL_PAYMENT',
      'TRAVEL_TICKET',
      'OTHER',
    ] as ServiceTypeKey[]
  ).includes(initialService as ServiceTypeKey)
    ? (initialService as ServiceTypeKey)
    : null;

  return (
    <div className={s.page}>
      {/* بازگشت */}
      <Link href="/services" className={s.backLink}>
        <ArrowRight size={14} aria-hidden="true" />
        بازگشت به خدمات
      </Link>

      {/* سربرگ متمرکز — بدون دکوراسیون (Stripe checkout focus) */}
      <header className={s.header}>
        <p className={s.eyebrow}>
          <span className={s.eyebrowDot} aria-hidden="true" />
          بازارچه خدمات آنلاین
        </p>
        <h1 className={s.title}>ثبت سفارش</h1>
        <p className={s.subtitle}>
          سرویس را انتخاب کنید — نرخ لحظه‌ای بازار قفل می‌شود و سفارش بدون مراجعهٔ حضوری ثبت می‌شود.
        </p>
      </header>

      {/* استریک نرخ زنده — دادهٔ واقعی snapshot */}
      <MarketStrip rates={marketRates} />

      <div className={s.grid}>
        {/* فرم — ستون اصلی */}
        <div className={s.formCol}>
          <div className={s.formCard}>
            <div className={s.formCardInner}>
              <TransferRequestForm
                initialService={validInitial}
                initialAmount={initialAmount}
                initialCurrency={initialCurrency}
                telegramLink={telegramLink}
                whatsappLink={whatsappLink}
                exchangeOptions={exchangeOptions}
              />
            </div>
          </div>
        </div>

        {/* تیکت سفارش — sticky ریل کناری */}
        <div className={s.asideCol}>
          <OrderTicket telegramLink={telegramLink} whatsappLink={whatsappLink} />
        </div>
      </div>
    </div>
  );
}
