'use client';

import { type FC, useState } from 'react';
import { TrendingUp, Users, CheckCircle2, Clock, ShieldCheck, Zap, Search, PenLine } from 'lucide-react';
import ServiceRequestForm from './ServiceRequestForm';
import TrackingForm from './TrackingForm';
import s from './ContactCTA.module.css';

/* ─── Data ───────────────────────────────────────────────────────────────── */

const STATS = [
  { icon: TrendingUp, value: '۲,۵۰۰+', label: 'تراکنش موفق ماهانه' },
  { icon: Users,      value: '۱۲,۰۰۰+', label: 'مشتری راضی' },
  { icon: CheckCircle2, value: '۹۸٪',  label: 'نرخ رضایت مشتریان' },
];

const FEATURES = [
  { icon: Clock,       label: 'پاسخگویی سریع',  desc: 'حداکثر ۳۰ دقیقه' },
  { icon: ShieldCheck, label: 'تراکنش امن',      desc: 'با ضمانت بازگشت وجه' },
  { icon: Zap,         label: 'پشتیبانی ۲۴/۷',  desc: 'همه روزه در خدمت شما' },
];

/* ─── Types ───────────────────────────────────────────────────────────────── */

type ServiceType =
  | 'INTERNATIONAL_TRANSFER'
  | 'ONLINE_PAYMENT'
  | 'TUITION_PAYMENT'
  | 'FREELANCE_INCOME'
  | 'SOFTWARE_PURCHASE'
  | 'GIFT_CARD'
  | 'OTHER';

interface ContactCTAClientProps {
  defaultServiceType?: ServiceType;
  telegramLink: string | null;
  whatsappLink: string | null;
}

/* ─── Component ───────────────────────────────────────────────────────────── */

const ContactCTAClient: FC<ContactCTAClientProps> = ({
  defaultServiceType = 'ONLINE_PAYMENT',
  telegramLink,
  whatsappLink,
}) => {
  const [activeTab, setActiveTab] = useState<'request' | 'tracking'>('request');

  return (
    <section id="contact" className={s.section}>
      {/* Ambient light blobs */}
      <div className={s.orbA} aria-hidden="true" />
      <div className={s.orbB} aria-hidden="true" />

      <div className={s.inner}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className={s.header}>
          <span className={s.eyebrow}>
            <TrendingUp size={13} />
            بیش از ۲,۵۰۰ تراکنش موفق در ماه
          </span>
          <h2 className={s.headerTitle}>
            درخواست خود را <span className={s.accent}>آنلاین</span> ثبت کنید
          </h2>
          <p className={s.headerSub}>
            فرم زیر را پر کنید تا کارشناسان ما در کمتر از ۳۰ دقیقه با شما تماس بگیرند
          </p>
        </header>

        {/* ── Social Proof Stats ────────────────────────────────────────── */}
        <div className={s.statsRow} role="list" aria-label="آمار خدمات">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div key={label} className={s.statCard} role="listitem">
              <div className={s.statIcon} aria-hidden="true">
                <Icon size={18} />
              </div>
              <div>
                <div className={s.statValue}>{value}</div>
                <div className={s.statLabel}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main Card ────────────────────────────────────────────────── */}
        <div className={s.card}>
          {/* Tab Switcher */}
          <div className={s.tabsWrap}>
            <div className={s.tabs} role="tablist" aria-label="انتخاب بخش">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'request'}
                aria-controls="panel-request"
                onClick={() => setActiveTab('request')}
                className={`${s.tabBtn} ${activeTab === 'request' ? s.tabBtnActive : ''}`}
              >
                <PenLine size={15} />
                ثبت درخواست
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'tracking'}
                aria-controls="panel-tracking"
                onClick={() => setActiveTab('tracking')}
                className={`${s.tabBtn} ${activeTab === 'tracking' ? s.tabBtnActive : ''}`}
              >
                <Search size={15} />
                پیگیری درخواست
              </button>
            </div>
          </div>

          {/* Features Bar — only visible on Request tab */}
          {activeTab === 'request' && (
            <div className={s.featuresBar} aria-hidden="true">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className={s.featureItem}>
                  <div className={s.featureIconWrap}>
                    <Icon size={16} />
                  </div>
                  <span className={s.featureLabel}>{label}</span>
                  <span className={s.featureDesc}>{desc}</span>
                </div>
              ))}
            </div>
          )}

          {/* Panel: Request */}
          <div
            id="panel-request"
            role="tabpanel"
            aria-labelledby="tab-request"
            hidden={activeTab !== 'request'}
          >
            <div className={s.cardBody}>
              <ServiceRequestForm
                defaultServiceType={defaultServiceType}
                telegramLink={telegramLink}
                whatsappLink={whatsappLink}
              />
            </div>
          </div>

          {/* Panel: Tracking */}
          <div
            id="panel-tracking"
            role="tabpanel"
            aria-labelledby="tab-tracking"
            hidden={activeTab !== 'tracking'}
          >
            <div className={s.cardBody}>
              <div className={s.trackingHeader}>
                <div className={s.trackingBadge}>پیگیری سفارش</div>
                <h3 className={s.trackingTitle}>پیگیری درخواست</h3>
                <p className={s.trackingDesc}>
                  کد پیگیری خود را وارد کنید تا وضعیت درخواست را مشاهده کنید
                </p>
              </div>
              <TrackingForm />
            </div>
          </div>
        </div>

        {/* ── Urgency Banner ───────────────────────────────────────────── */}
        <div className={s.urgencyBanner}>
          <div className={s.urgencyPill}>
            <Clock size={16} />
            <span>پاسخگویی در کمتر از ۳۰ دقیقه</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactCTAClient;
