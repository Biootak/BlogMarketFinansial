'use client';

/**
 * TrustSection — about + contact in asymmetric 3-col layout.
 *
 *   col 1: دربارهٔ صرافی (text + 3 trust signals)
 *   col 2: اطلاعات تماس (تلفن، ایمیل، وبسایت، آدرس)
 *   col 3: اطلاعات اعتماد (مجوز، سال تأسیس، ایمنی)
 */

import {
  Building2,
  CalendarDays,
  Globe,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import s from './TrustSection.module.css';

type Props = {
  exchange: {
    name: string;
    displayName: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    licenseNo: string | null;
    city: string | null;
    createdAt: Date;
  };
};

const _FA_MONTHS = [
  'حمل',
  'ثور',
  'جوزا',
  'سرطان',
  'اسد',
  'سنبله',
  'میزان',
  'عقرب',
  'قوس',
  'جدی',
  'دلو',
  'حوت',
];

function persianDate(d: Date) {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return d.toLocaleDateString('fa-IR');
  }
}

function gregorianDate(d: Date) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return d.toDateString();
  }
}

export default function TrustSection({ exchange }: Props) {
  const displayName = exchange.displayName ?? exchange.name;
  const phoneTel = exchange.phone?.replace(/[^\d+]/g, '') ?? '';
  const foundedYear = exchange.createdAt.getFullYear();
  const yearsActive = new Date().getFullYear() - foundedYear;

  return (
    <section className={s.section} id="about" aria-label="درباره و اطلاعات تماس" dir="rtl">
      <div className={s.inner}>
        {/* ── Header ────────────────────────────────────────────── */}
        <header className={s.header}>
          <div className={s.eyebrow}>
            <ShieldCheck size={12} strokeWidth={1.9} aria-hidden />
            اعتماد و اطلاعات تماس
          </div>
          <h2 className={s.title}>صرافی {displayName}</h2>
          <p className={s.sub}>
            اطلاعات رسمی صرافی شامل آدرس، راه‌های ارتباطی و مجوزهای صادرشده. پیش از مراجعه حضوری،
            حتماً ساعات کاری را بررسی کنید.
          </p>
        </header>

        <div className={s.grid}>
          {/* ── Col 1: About ──────────────────────────────────── */}
          <article className={s.col} aria-labelledby="about-h">
            <h3 id="about-h" className={s.colTitle}>
              <Building2 size={14} strokeWidth={1.9} aria-hidden />
              دربارهٔ صرافی
            </h3>

            <p className={s.aboutText}>
              {displayName} یکی از صرافی‌های ثبت‌شده در پلتفرم ماست که خدمات خرید و فروش ارزهای خارجی
              را در شهر {exchange.city ?? '—'} ارائه می‌دهد. تمامی نرخ‌های نمایش داده‌شده در این صفحه
              مستقیماً توسط صرافی و از طریق پنل کاربری ثبت می‌شوند و هر ۶۰ ثانیه به‌روزرسانی می‌گردند.
            </p>

            <ul className={s.trustList} aria-label="نشانه‌های اعتماد">
              <li className={s.trustItem}>
                <span className={s.trustIcon} aria-hidden>
                  <ShieldCheck size={14} strokeWidth={1.9} />
                </span>
                <div>
                  <p className={s.trustItemTitle}>صرافی تأییدشده</p>
                  <p className={s.trustItemDesc}>مدارک هویتی و مجوز فعالیت بررسی شده است.</p>
                </div>
              </li>
              <li className={s.trustItem}>
                <span className={s.trustIcon} aria-hidden>
                  <CalendarDays size={14} strokeWidth={1.9} />
                </span>
                <div>
                  <p className={s.trustItemTitle}>
                    {yearsActive > 0
                      ? `${new Intl.NumberFormat('fa-IR').format(yearsActive)} سال سابقه`
                      : 'صرافی تازه‌تأسیس'}
                  </p>
                  <p className={s.trustItemDesc}>
                    فعالیت رسمی از {gregorianDate(exchange.createdAt)} (شمسی:{' '}
                    {persianDate(exchange.createdAt)}).
                  </p>
                </div>
              </li>
              <li className={s.trustItem}>
                <span className={s.trustIcon} aria-hidden>
                  <Shield size={14} strokeWidth={1.9} />
                </span>
                <div>
                  <p className={s.trustItemTitle}>
                    {exchange.licenseNo ? `مجوز ${exchange.licenseNo}` : 'مجوز در حال بررسی'}
                  </p>
                  <p className={s.trustItemDesc}>شمارهٔ مجوز رسمی فعالیت از مراجع ذی‌ربط.</p>
                </div>
              </li>
            </ul>
          </article>

          {/* ── Col 2: Contact ────────────────────────────────── */}
          <article className={s.col} id="contact" aria-labelledby="contact-h">
            <h3 id="contact-h" className={s.colTitle}>
              <Phone size={14} strokeWidth={1.9} aria-hidden />
              راه‌های ارتباطی
            </h3>

            <ul className={s.contactList}>
              {exchange.phone ? (
                <li className={s.contactItem}>
                  <a href={`tel:${phoneTel}`} className={s.contactLink} dir="ltr">
                    <span className={s.contactIcon} aria-hidden>
                      <Phone size={14} strokeWidth={1.9} />
                    </span>
                    <span className={s.contactBody}>
                      <span className={s.contactLabel}>تلفن</span>
                      <span className={s.contactValue}>{exchange.phone}</span>
                    </span>
                  </a>
                </li>
              ) : null}
              {exchange.email ? (
                <li className={s.contactItem}>
                  <a href={`mailto:${exchange.email}`} className={s.contactLink} dir="ltr">
                    <span className={s.contactIcon} aria-hidden>
                      <Mail size={14} strokeWidth={1.9} />
                    </span>
                    <span className={s.contactBody}>
                      <span className={s.contactLabel}>ایمیل</span>
                      <span className={s.contactValue}>{exchange.email}</span>
                    </span>
                  </a>
                </li>
              ) : null}
              {exchange.website ? (
                <li className={s.contactItem}>
                  <a
                    href={exchange.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.contactLink}
                  >
                    <span className={s.contactIcon} aria-hidden>
                      <Globe size={14} strokeWidth={1.9} />
                    </span>
                    <span className={s.contactBody}>
                      <span className={s.contactLabel}>وبسایت رسمی</span>
                      <span className={s.contactValue}>
                        {(() => {
                          try {
                            return new URL(exchange.website).hostname.replace(/^www\./, '');
                          } catch {
                            return exchange.website;
                          }
                        })()}
                      </span>
                    </span>
                  </a>
                </li>
              ) : null}
              {exchange.address ? (
                <li className={s.contactItem}>
                  <div className={s.contactLink}>
                    <span className={s.contactIcon} aria-hidden>
                      <MapPin size={14} strokeWidth={1.9} />
                    </span>
                    <span className={s.contactBody}>
                      <span className={s.contactLabel}>آدرس</span>
                      <span className={s.contactValue}>
                        {exchange.city ? `${exchange.city}، ` : ''}
                        {exchange.address}
                      </span>
                    </span>
                  </div>
                </li>
              ) : null}
              {!exchange.phone && !exchange.email && !exchange.website && !exchange.address && (
                <li className={s.contactEmpty}>اطلاعات تماس توسط صرافی ثبت نشده است.</li>
              )}
            </ul>
          </article>

          {/* ── Col 3: Operations ──────────────────────────────── */}
          <article className={s.col} aria-labelledby="ops-h">
            <h3 id="ops-h" className={s.colTitle}>
              <ShieldCheck size={14} strokeWidth={1.9} aria-hidden />
              استانداردهای ایمنی
            </h3>

            <div className={s.safetyGrid}>
              <div className={s.safetyItem}>
                <div className={s.safetyTop}>
                  <span className={s.safetyLabel}>نرخ‌های زنده</span>
                  <span className={s.safetyValue}>۶۰ ثانیه</span>
                </div>
                <p className={s.safetyDesc}>نرخ‌ها هر دقیقه از پنل صرافی دریافت می‌شوند.</p>
              </div>
              <div className={s.safetyItem}>
                <div className={s.safetyTop}>
                  <span className={s.safetyLabel}>تأیید هویت</span>
                  <span className={s.safetyValueOk}>
                    <ShieldCheck size={11} strokeWidth={2.4} aria-hidden />
                    انجام‌شده
                  </span>
                </div>
                <p className={s.safetyDesc}>مدارک هویتی صرافی بررسی و تأیید شده است.</p>
              </div>
              <div className={s.safetyItem}>
                <div className={s.safetyTop}>
                  <span className={s.safetyLabel}>دسترسی</span>
                  <span className={s.safetyValue}>۲۴/۷</span>
                </div>
                <p className={s.safetyDesc}>صفحهٔ پروفایل به‌صورت شبانه‌روزی در دسترس است.</p>
              </div>
              <div className={s.safetyItem}>
                <div className={s.safetyTop}>
                  <span className={s.safetyLabel}>حریم خصوصی</span>
                  <span className={s.safetyValueOk}>
                    <ShieldCheck size={11} strokeWidth={2.4} aria-hidden />
                    محرمانه
                  </span>
                </div>
                <p className={s.safetyDesc}>اطلاعات مشتریان هرگز به اشتراک گذاشته نمی‌شود.</p>
              </div>
            </div>
          </article>
        </div>

        {/* ── Disclaimer ──────────────────────────────────────── */}
        <p className={s.disclaimer}>
          نرخ‌های نمایش‌داده‌شده در این صفحه صرفاً جنبهٔ اطلاع‌رسانی دارند و به‌معنای پیشنهاد رسمی خرید یا
          فروش نیستند. برای انجام معامله، لطفاً مستقیماً با صرافی تماس بگیرید یا به‌صورت حضوری مراجعه
          کنید. پلتفرم هیچ‌گونه مسئولیتی در قبال تغییرات لحظه‌ای نرخ یا اختلاف بین نرخ نمایشی و نرخ
          نهایی ندارد.
        </p>
      </div>
    </section>
  );
}
