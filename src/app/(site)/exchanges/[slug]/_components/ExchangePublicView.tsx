'use client';

/**
 * ExchangePublicView — نمای اصلی صفحهٔ عمومی صرافی
 *
 *   ساختار P2026:
 *   ─────────────────────────────────────────────────────────
 *   1. Hero identity — لوگو + نام + شهر + verified badge
 *   2. Live rates — نرخ خرید/فروش لحظه‌ای ارزهای فعال
 *   3. About + Contact — اطلاعات تماس + مجوز + آدرس
 *
 *   ⚠️ این صفحه فقط برای صرافی‌های ACTIVE نمایش داده می‌شود
 *   (server-side gate). هر ۶۰ ثانیه revalidate.
 */

import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  Mail,
  MapPin,
  Phone,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import s from './ExchangePublicView.module.css';

type ExchangePublicData = {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  logoUrl: string | null;
  city: string | null;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  licenseNo: string | null;
  status: string;
  createdAt: Date;
  _count: { Customer: number; Transaction: number };
};

type RateData = {
  currencyCode: string;
  buyRate: string;
  sellRate: string;
  unit: string;
  createdAt: Date;
};

type Props = {
  exchange: ExchangePublicData;
  rates: RateData[];
};

// ── Map کد ارز به نام فارسی + ایموجی پرچم (سبک) ─────────────
const CURRENCY_META: Record<string, { label: string; flag: string }> = {
  USD: { label: 'دلار آمریکا', flag: '🇺🇸' },
  EUR: { label: 'یورو', flag: '🇪🇺' },
  AED: { label: 'درهم امارات', flag: '🇦🇪' },
  GBP: { label: 'پوند انگلیس', flag: '🇬🇧' },
  AFN: { label: 'افغانی', flag: '🇦🇫' },
  IRR: { label: 'ریال ایران', flag: '🇮🇷' },
  PKR: { label: 'روپیه پاکستان', flag: '🇵🇰' },
  INR: { label: 'روپیه هند', flag: '🇮🇳' },
  TRY: { label: 'لیر ترکیه', flag: '🇹🇷' },
  SAR: { label: 'ریال عربستان', flag: '🇸🇦' },
  CAD: { label: 'دلار کانادا', flag: '🇨🇦' },
  AUD: { label: 'دلار استرالیا', flag: '🇦🇺' },
  CHF: { label: 'فرانک سوئیس', flag: '🇨🇭' },
  CNY: { label: 'یوان چین', flag: '🇨🇳' },
  JPY: { label: 'ین ژاپن', flag: '🇯🇵' },
};

const CURRENCY_DEFAULT = { label: 'ارز', flag: '💱' };

export default function ExchangePublicView({ exchange, rates }: Props) {
  const displayName = exchange.displayName ?? exchange.name;
  const fa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' });

  return (
    <main className={s.root} dir="rtl">
      {/* ── 1. Hero identity ──────────────────────────────────────── */}
      <section className={s.hero} aria-label={`صرافی ${displayName}`}>
        <div className={s.heroAmbient} aria-hidden />
        <div className={s.heroHairline} aria-hidden />

        <div className={s.heroInner}>
          <div className={s.heroLogo}>
            {exchange.logoUrl ? (
              // biome-ignore lint/performance/noImgElement: dynamic user URL
              <img src={exchange.logoUrl} alt="" className={s.heroLogoImg} />
            ) : (
              <Building2 size={36} strokeWidth={1.3} className={s.heroLogoFallback} aria-hidden />
            )}
          </div>

          <div className={s.heroNameRow}>
            <h1 className={s.heroName}>{displayName}</h1>
            <span className={s.verifiedBadge} title="صرافی تأییدشده">
              <CheckCircle2 size={13} strokeWidth={2.4} aria-hidden />
              تأییدشده
            </span>
          </div>

          {exchange.city && (
            <div className={s.heroCity}>
              <MapPin size={13} strokeWidth={2} aria-hidden />
              {exchange.city}
            </div>
          )}

          {/* Stats strip */}
          <div className={s.heroStats} aria-label="آمار سریع">
            <div className={s.stat}>
              <Users size={13} strokeWidth={2} aria-hidden />
              <span className={s.statNum}>
                {new Intl.NumberFormat('fa-IR').format(exchange._count.Customer)}
              </span>
              <span className={s.statLabel}>مشتری</span>
            </div>
            <span className={s.statDivider} aria-hidden />
            <div className={s.stat}>
              <TrendingUp size={13} strokeWidth={2} aria-hidden />
              <span className={s.statNum}>
                {new Intl.NumberFormat('fa-IR').format(exchange._count.Transaction)}
              </span>
              <span className={s.statLabel}>تراکنش</span>
            </div>
            <span className={s.statDivider} aria-hidden />
            <div className={s.stat}>
              <Clock size={13} strokeWidth={2} aria-hidden />
              <span className={s.statNum}>
                {new Intl.NumberFormat('fa-IR').format(rates.length)}
              </span>
              <span className={s.statLabel}>ارز فعال</span>
            </div>
          </div>

          {/* CTA — مقایسه */}
          <div className={s.heroCta}>
            <Link href="/exchanges" className={s.heroCtaBtn}>
              <ArrowUpRight size={14} strokeWidth={2.2} aria-hidden />
              مقایسه با سایر صرافی‌ها
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. Live rates ─────────────────────────────────────────── */}
      <section className={s.section} aria-label="نرخ‌های لحظه‌ای">
        <div className={s.sectionInner}>
          <div className={s.sectionHeader}>
            <div className={s.eyebrow}>
              <TrendingUp size={12} strokeWidth={2.2} aria-hidden />
              نرخ لحظه‌ای
            </div>
            <h2 className={s.sectionTitle}>نرخ خرید و فروش ارزها</h2>
            <p className={s.sectionSub}>
              نرخ‌ها توسط صرافی ثبت می‌شوند و هر ۶۰ ثانیه به‌روز می‌گردند. برای نرخ دقیق و
              معامله، با صرافی تماس بگیرید.
            </p>
          </div>

          {rates.length === 0 ? (
            <div className={s.emptyRates}>
              <TrendingUp size={28} strokeWidth={1.4} aria-hidden />
              <p>در حال حاضر نرخ فعالی برای این صرافی ثبت نشده است.</p>
            </div>
          ) : (
            <div className={s.rateGrid}>
              {rates.map((rate) => {
                const meta = CURRENCY_META[rate.currencyCode] ?? {
                  ...CURRENCY_DEFAULT,
                  label: rate.currencyCode,
                };
                const buy = Number(rate.buyRate);
                const sell = Number(rate.sellRate);
                const spread = sell - buy;
                const spreadPct = buy > 0 ? (spread / buy) * 100 : 0;
                return (
                  <article key={rate.currencyCode} className={s.rateCard}>
                    <header className={s.rateHead}>
                      <div className={s.rateCurrency}>
                        <span className={s.rateFlag} aria-hidden>
                          {meta.flag}
                        </span>
                        <div>
                          <div className={s.rateCode}>{rate.currencyCode}</div>
                          <div className={s.rateLabel}>{meta.label}</div>
                        </div>
                      </div>
                      <div className={s.rateSpread} title="کارمزد خرید و فروش">
                        {new Intl.NumberFormat('fa-IR', {
                          maximumFractionDigits: 2,
                        }).format(spreadPct)}
                        ٪
                      </div>
                    </header>
                    <div className={s.rateBody}>
                      <div className={s.rateRow}>
                        <span className={s.rateKey}>خرید</span>
                        <span className={s.rateValue} dir="ltr">
                          {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(
                            Math.round(buy),
                          )}
                          <span className={s.rateUnit}>{rate.unit}</span>
                        </span>
                      </div>
                      <div className={s.rateRow}>
                        <span className={s.rateKey}>فروش</span>
                        <span className={s.rateValue} dir="ltr">
                          {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(
                            Math.round(sell),
                          )}
                          <span className={s.rateUnit}>{rate.unit}</span>
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── 3. About + 4. Contact ─────────────────────────────────── */}
      <section className={s.section} aria-label="درباره صرافی">
        <div className={s.sectionInner}>
          <div className={s.twoCol}>
            {/* About card */}
            <article className={s.card}>
              <header className={s.cardHead}>
                <div className={s.cardIcon} aria-hidden>
                  <Building2 size={16} strokeWidth={1.8} />
                </div>
                <h3 className={s.cardTitle}>دربارهٔ صرافی</h3>
              </header>
              <dl className={s.kvList}>
                {exchange.licenseNo && (
                  <div className={s.kv}>
                    <dt>
                      <Shield size={12} aria-hidden /> شماره مجوز
                    </dt>
                    <dd dir="ltr">{exchange.licenseNo}</dd>
                  </div>
                )}
                {exchange.address && (
                  <div className={s.kv}>
                    <dt>
                      <MapPin size={12} aria-hidden /> آدرس
                    </dt>
                    <dd>{exchange.address}</dd>
                  </div>
                )}
                <div className={s.kv}>
                  <dt>
                    <Clock size={12} aria-hidden /> تاریخ عضویت
                  </dt>
                  <dd>{fa.format(exchange.createdAt)}</dd>
                </div>
              </dl>
            </article>

            {/* Contact card */}
            <article className={s.card}>
              <header className={s.cardHead}>
                <div className={s.cardIcon} aria-hidden>
                  <Phone size={16} strokeWidth={1.8} />
                </div>
                <h3 className={s.cardTitle}>راه‌های ارتباطی</h3>
              </header>
              <ul className={s.contactList}>
                {exchange.phone && (
                  <li>
                    <a
                      href={`tel:${exchange.phone}`}
                      className={s.contactItem}
                      dir="ltr"
                    >
                      <Phone size={13} strokeWidth={2} aria-hidden />
                      <span>{exchange.phone}</span>
                    </a>
                  </li>
                )}
                {exchange.email && (
                  <li>
                    <a href={`mailto:${exchange.email}`} className={s.contactItem} dir="ltr">
                      <Mail size={13} strokeWidth={2} aria-hidden />
                      <span>{exchange.email}</span>
                    </a>
                  </li>
                )}
                {exchange.website && (
                  <li>
                    <a
                      href={exchange.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={s.contactItem}
                      dir="ltr"
                    >
                      <Globe size={13} strokeWidth={2} aria-hidden />
                      <span>{exchange.website.replace(/^https?:\/\//, '')}</span>
                      <ArrowUpRight size={11} strokeWidth={2.2} aria-hidden />
                    </a>
                  </li>
                )}
                {!exchange.phone && !exchange.email && !exchange.website && (
                  <li className={s.contactEmpty}>اطلاعات تماس ثبت نشده است</li>
                )}
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* ── Footer note ────────────────────────────────────────────── */}
      <section className={s.section} aria-label="یادداشت">
        <div className={s.sectionInner}>
          <div className={s.disclaimer}>
            <Shield size={13} strokeWidth={2} aria-hidden />
            <span>
              این صرافی توسط تیم <strong>blogmarketfinansial</strong> اعتبارسنجی شده است.
              با‌این‌حال، معامله با مسئولیت خودتان انجام می‌شود.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
