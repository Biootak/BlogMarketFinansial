'use client';

/**
 * ServiceOrderCheckout — جریان یکپارچه «ثبت سفارش» (checkout pattern)
 * ─────────────────────────────────────────────────────────────────────────────
 * ساختار از checkout شرکت‌های بزرگ مالی اقتباس شده (Stripe × Wise):
 *  - صفحه متمرکز بدون دکوراسیون اضافه — فرم + پنل خلاصه زنده
 *  - خلاصه سفارش sticky که با تایپ کاربر زنده آپدیت می‌شود (Wise-style)
 *  - deep-link: ?service=X&amount=Y&currency=Z
 *
 * خلاصه از طریق CustomEvent ('mt:form-sync') به فرم وصل است — بدون prop-drilling.
 */
import TransferRequestForm, {
  SERVICE_OPTIONS,
  type ServiceTypeKey,
} from '@/components/money-transfer/TransferRequestForm';
import { ArrowRight, BadgeCheck, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
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
}

interface Props {
  initialService: string | null;
  initialAmount?: string;
  initialCurrency?: string;
  telegramLink?: string | null;
  whatsappLink?: string | null;
}

// ─── Live Summary — پنل خلاصه سفارش (شنوندهٔ رویداد فرم) ─────────────────── //
function LiveSummary({
  telegramLink,
  whatsappLink,
}: { telegramLink?: string | null; whatsappLink?: string | null }) {
  const [payload, setPayload] = useState<OrderSyncPayload | null>(null);
  const [amountPulse, setAmountPulse] = useState(0);

  useEffect(() => {
    const onSync = (e: Event) => {
      const detail = (e as CustomEvent<OrderSyncPayload>).detail;
      setPayload((prev) => {
        if (prev && prev.amount !== detail.amount) setAmountPulse((k) => k + 1);
        return detail;
      });
    };
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);

  // بدون انتخاب → empty state
  if (!payload || payload.step === 0) {
    return (
      <aside className={s.summary} aria-label="خلاصه سفارش">
        <h3 className={s.summaryTitle}>خلاصه سفارش</h3>
        <div className={s.summaryEmpty}>
          <Sparkles size={18} className={s.emptyIcon} aria-hidden="true" />
          <p className={s.emptyText}>هنوز سرویسی انتخاب نشده است.</p>
          <p className={s.emptyHint}>
            سرویس مورد نظر را از فرم کنار انتخاب کنید — خلاصه همین‌جا زنده می‌شود.
          </p>
        </div>
        <ul className={s.summaryMeta}>
          <li>
            <Clock3 size={13} aria-hidden="true" />
            پاسخ کارشناس در کمتر از ۳۰ دقیقه
          </li>
          <li>
            <ShieldCheck size={13} aria-hidden="true" />
            بدون هزینه پنهان — نرخ شفاف
          </li>
        </ul>
      </aside>
    );
  }

  // موفقیت → کد پیگیری
  if (payload.success && payload.trackingCode) {
    return (
      <aside className={s.summary} aria-label="خلاصه سفارش">
        <h3 className={s.summaryTitle}>خلاصه سفارش</h3>
        <div className={s.summarySuccess}>
          <span className={s.successBadge} aria-hidden="true">
            <BadgeCheck size={16} />
          </span>
          <p className={s.successTitle}>درخواست ثبت شد</p>
          <p className={s.successCode} dir="ltr">
            {payload.trackingCode}
          </p>
          <p className={s.successHint}>کد پیگیری را برای پیگیری وضعیت نگه دارید.</p>
        </div>
      </aside>
    );
  }

  const svc = SERVICE_OPTIONS.find((o) => o.key === payload.service);
  const Icon = svc?.icon;

  return (
    <aside className={s.summary} aria-label="خلاصه سفارش">
      <h3 className={s.summaryTitle}>خلاصه سفارش</h3>

      {/* سرویس */}
      <div className={s.summaryService}>
        {Icon && (
          <span className={s.serviceIcon} aria-hidden="true">
            <Icon size={16} />
          </span>
        )}
        <div>
          <p className={s.serviceLabel}>{payload.serviceLabel || svc?.label}</p>
          <p className={s.serviceSub}>{svc?.sublabel}</p>
        </div>
      </div>

      {/* مبلغ — با پالس ظریف هنگام تغییر */}
      <div className={s.amountBlock}>
        {payload.amount ? (
          <p key={amountPulse} className={`${s.amount} anim-fade-in-up`} dir="ltr">
            {payload.amount}
            <span className={s.amountCurrency}>{payload.currencyLabel}</span>
          </p>
        ) : (
          <p className={s.amountPlaceholder}>مبلغ را وارد کنید</p>
        )}
        <p className={s.amountNote}>نرخ دقیق توسط کارشناس تأیید می‌شود</p>
      </div>

      {/* جزئیات */}
      {(payload.destination || payload.urgency === 'URGENT') && (
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

      <div className={s.summaryFooter}>
        <p className={s.footerNote}>
          <ShieldCheck size={13} aria-hidden="true" />
          سفارش شما بدون پرداخت پیش‌پرداخت بررسی می‌شود.
        </p>
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
      </div>
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
}: Props) {
  const validInitial = SERVICE_OPTIONS.some((o) => o.key === initialService)
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
          سرویس را انتخاب کنید و در چند مرحله سفارش خود را ثبت کنید — بدون مراجعه حضوری.
        </p>
      </header>

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
              />
            </div>
          </div>
        </div>

        {/* خلاصه زنده — sticky */}
        <div className={s.asideCol}>
          <LiveSummary telegramLink={telegramLink} whatsappLink={whatsappLink} />
        </div>
      </div>
    </div>
  );
}
