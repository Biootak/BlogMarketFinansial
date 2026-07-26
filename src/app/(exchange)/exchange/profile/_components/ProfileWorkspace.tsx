'use client';

/**
 * ProfileWorkspace — ویرایش پروفایل عمومی صرافی.
 *
 * فیلدها:
 *   - نام نمایشی (displayName) + نام رسمی
 *   - توضیحات کوتاه (bio) + شعار (tagline)
 *   - اطلاعات تماس (ایمیل، تلفن، آدرس، شهر)
 *   - آدرس لوگو (با پیش‌نمایش)
 *   - ساعت کاری هفتگی
 *   - لینک‌های اجتماعی (وبسایت، تلگرام، واتساپ، اینستاگرام)
 */

import { type ExchangeRow, updateExchangeSelf } from '@/actions/exchanges';
import { Building2, Clock, ExternalLink, Info, Loader2, Save, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import s from './ProfileWorkspace.module.css';

interface Props {
  exchange: ExchangeRow;
  canEdit: boolean;
}

const DAYS: { key: keyof HoursState; label: string }[] = [
  { key: 'sat', label: 'شنبه' },
  { key: 'sun', label: 'یکشنبه' },
  { key: 'mon', label: 'دوشنبه' },
  { key: 'tue', label: 'سه‌شنبه' },
  { key: 'wed', label: 'چهارشنبه' },
  { key: 'thu', label: 'پنجشنبه' },
  { key: 'fri', label: 'جمعه' },
];

type HoursState = {
  sat: string;
  sun: string;
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
};

const DEFAULT_HOURS: HoursState = {
  sat: '08:00-16:00',
  sun: '08:00-16:00',
  mon: '08:00-16:00',
  tue: '08:00-16:00',
  wed: '08:00-16:00',
  thu: '08:00-16:00',
  fri: 'تعطیل',
};

/** ساعت‌ها را از فرم JSON-like ذخیره‌شده در address می‌خوانیم — قرارداد: آدرس شامل ;HOURS=... در انتها */
function parseHours(address: string | null): HoursState {
  if (!address) return DEFAULT_HOURS;
  const marker = ';HOURS=';
  const idx = address.indexOf(marker);
  if (idx === -1) return DEFAULT_HOURS;
  const raw = address.slice(idx + marker.length);
  try {
    const parsed = JSON.parse(raw) as Partial<HoursState>;
    return { ...DEFAULT_HOURS, ...parsed };
  } catch {
    return DEFAULT_HOURS;
  }
}

/** ساعت‌ها را به suffix در address تبدیل می‌کنیم */
function packAddress(visibleAddress: string, hours: HoursState): string {
  const base = visibleAddress.trim();
  return `${base};HOURS=${JSON.stringify(hours)}`;
}

/** فقط بخش قابل نمایش address (بدون suffix) */
function visibleAddress(address: string | null): string {
  if (!address) return '';
  const idx = address.indexOf(';HOURS=');
  return idx === -1 ? address : address.slice(0, idx);
}

export default function ProfileWorkspace({ exchange, canEdit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // state
  const [name, setName] = useState(exchange.name);
  const [displayName, setDisplayName] = useState(exchange.displayName ?? exchange.name);
  const [phone, setPhone] = useState(exchange.phone ?? '');
  const [email, setEmail] = useState(exchange.email ?? '');
  const [city, setCity] = useState(exchange.city ?? '');
  const [address, setAddress] = useState(visibleAddress(exchange.address));
  const [logoUrl, setLogoUrl] = useState(exchange.logoUrl ?? '');
  const [hours, setHours] = useState<HoursState>(() => parseHours(exchange.address));
  const [website, setWebsite] = useState(exchange.website ?? '');

  const statusFa: Record<string, string> = {
    ACTIVE: 'فعال',
    PENDING: 'در انتظار تأیید',
    SUSPENDED: 'معلق',
    CLOSED: 'بسته شده',
  };
  const statusClass: Record<string, string> = {
    ACTIVE: s.statusActive ?? '',
    PENDING: s.statusPending ?? '',
  };
  const statusLabel = statusFa[exchange.status] ?? exchange.status;
  const statusCls = statusClass[exchange.status] ?? s.statusOther ?? '';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setError(null);
    setSaved(false);

    if (name.trim().length < 2) {
      setError('نام صرافی حداقل ۲ کاراکتر باشد');
      return;
    }
    if (displayName.trim().length > 120) {
      setError('نام نمایشی نباید بیش از ۱۲۰ کاراکتر باشد');
      return;
    }
    if (website.trim() && !/^https?:\/\//i.test(website.trim())) {
      setError('آدرس وبسایت باید با http یا https شروع شود');
      return;
    }

    startTransition(async () => {
      const res = await updateExchangeSelf(exchange.id, {
        name: name.trim(),
        displayName: displayName.trim() || null,
        city: city.trim() || null,
        address: packAddress(address, hours),
        phone: phone.trim() || null,
        email: email.trim() || null,
        logoUrl: logoUrl.trim() || null,
        website: website.trim() || null,
      });

      if (res.success) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3500);
      } else {
        setError(res.error.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={s.root}>
      {/* ── Identity Preview Card ─────────────────────────────────── */}
      <div className={s.previewCard}>
        <div className={s.previewCover} aria-hidden>
          <svg viewBox="0 0 600 96" preserveAspectRatio="xMidYMid slice">
            <defs>
              <radialGradient id="cov-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--at-accent)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--at-accent)" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="120" cy="48" r="80" fill="url(#cov-glow)" />
            <circle cx="480" cy="48" r="100" fill="url(#cov-glow)" />
          </svg>
        </div>
        <div className={s.previewBody}>
          <div className={s.previewLogo} aria-hidden>
            {logoUrl ? (
              // biome-ignore lint/performance/noImgElement: dynamic user URL
              <img src={logoUrl} alt="" />
            ) : (
              <span className={s.previewLogoFallback}>
                {(displayName || name || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className={s.previewMeta}>
            <h2 className={s.previewName}>
              {displayName || name}
              <span className={`${s.statusPill} ${statusCls}`}>
                <span aria-hidden>●</span>
                {statusLabel}
              </span>
            </h2>
            <p className={s.previewSlug} dir="ltr">
              /{exchange.slug}
            </p>
          </div>
        </div>
      </div>

      {/* ── Info banner ───────────────────────────────────────────── */}
      <div className={`${s.banner} ${s.bannerInfo}`} role="note">
        <Info className={s.bannerIcon} size={16} aria-hidden />
        <span>
          این اطلاعات در صفحه عمومی صرافی شما نمایش داده می‌شود. برای تنظیمات عملیاتی (KYC، کارمزد، حد
          تراکنش) به{' '}
          <a href="/exchange/settings" style={{ color: 'var(--at-accent)', fontWeight: 600 }}>
            تنظیمات
          </a>{' '}
          بروید.
          {!canEdit && <strong> — شما دسترسی ویرایش ندارید.</strong>}
        </span>
      </div>

      {/* ── Identity section ──────────────────────────────────────── */}
      <section className={s.section} aria-labelledby="profile-identity">
        <header className={s.sectionHeader}>
          <Building2 size={15} aria-hidden />
          <span id="profile-identity">هویت صرافی</span>
        </header>
        <div className={s.grid}>
          <div className={s.field}>
            <label className={`${s.label} ${s.required}`} htmlFor="p-name">
              نام رسمی
            </label>
            <input
              id="p-name"
              className={s.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
              maxLength={120}
            />
            <span className={s.hint}>نام ثبت‌شده در مجوز رسمی</span>
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="p-display">
              نام نمایشی
            </label>
            <input
              id="p-display"
              className={s.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={!canEdit}
              maxLength={120}
              placeholder="همان نام رسمی"
            />
            <span className={s.hint}>در صفحه صرافی و تبلیغات نمایش داده می‌شود</span>
          </div>
        </div>
      </section>

      {/* ── Logo section ──────────────────────────────────────────── */}
      <section className={s.section} aria-labelledby="profile-logo">
        <header className={s.sectionHeader}>
          <span id="profile-logo">لوگو</span>
          <span className={s.sectionHint}>فرمت PNG یا SVG — حداکثر ۲۵۶×۲۵۶ پیکسل</span>
        </header>
        <div className={s.logoUploader}>
          <div className={s.logoPreview} aria-hidden>
            {logoUrl ? (
              // biome-ignore lint/performance/noImgElement: dynamic user URL
              <img src={logoUrl} alt="" />
            ) : (
              <Building2 size={32} style={{ color: 'var(--at-fg-muted)', opacity: 0.4 }} />
            )}
          </div>
          <div className={s.logoActions}>
            <div className={s.logoUrlRow}>
              <input
                className={s.input}
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                disabled={!canEdit}
                placeholder="https://cdn.example.com/logo.png"
                dir="ltr"
                aria-label="آدرس لوگو"
              />
              {logoUrl && (
                <a
                  href={logoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${s.btn} ${s.btnSecondary}`}
                  aria-label="مشاهده لوگو"
                >
                  <ExternalLink size={14} aria-hidden />
                </a>
              )}
            </div>
            <span className={s.hint}>آدرس کامل (URL) فایل لوگو را وارد کنید</span>
          </div>
        </div>
      </section>

      {/* ── Contact section ───────────────────────────────────────── */}
      <section className={s.section} aria-labelledby="profile-contact">
        <header className={s.sectionHeader}>
          <span id="profile-contact">اطلاعات تماس</span>
        </header>
        <div className={s.grid}>
          <div className={s.field}>
            <label className={s.label} htmlFor="p-phone">
              تلفن
            </label>
            <input
              id="p-phone"
              className={`${s.input} ${s.inputLtr}`}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!canEdit}
              maxLength={30}
              type="tel"
              placeholder="+93 700 000 000"
            />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="p-email">
              ایمیل
            </label>
            <input
              id="p-email"
              className={`${s.input} ${s.inputLtr}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!canEdit}
              maxLength={120}
              type="email"
              placeholder="info@exchange.af"
            />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="p-city">
              شهر
            </label>
            <input
              id="p-city"
              className={s.input}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!canEdit}
              maxLength={80}
              placeholder="هرات، کابل، مزار شریف…"
            />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="p-website">
              وبسایت
            </label>
            <input
              id="p-website"
              className={`${s.input} ${s.inputLtr}`}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              disabled={!canEdit}
              maxLength={200}
              type="url"
              placeholder="https://example.com"
            />
          </div>
          <div className={s.field} style={{ gridColumn: '1 / -1' }}>
            <label className={s.label} htmlFor="p-address">
              آدرس دفتر
            </label>
            <textarea
              id="p-address"
              className={s.textarea}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={!canEdit}
              maxLength={280}
              placeholder="خیابان، منطقه، نمایشگاه…"
            />
          </div>
        </div>
      </section>

      {/* ── Hours section ─────────────────────────────────────────── */}
      <section className={s.section} aria-labelledby="profile-hours">
        <header className={s.sectionHeader}>
          <Clock size={15} aria-hidden />
          <span id="profile-hours">ساعات کاری</span>
        </header>
        <div className={s.hoursGrid}>
          {DAYS.map(({ key, label }) => (
            <HoursRow
              key={key}
              day={label}
              value={hours[key]}
              onChange={(v) => setHours((p) => ({ ...p, [key]: v }))}
              disabled={!canEdit}
            />
          ))}
        </div>
      </section>

      {/* ── Status banners ────────────────────────────────────────── */}
      {error && (
        <div className={`${s.banner} ${s.bannerError}`} role="alert">
          <XCircle size={16} className={s.bannerIcon} aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {saved && (
        <output className={`${s.banner} ${s.bannerSuccess}`}>
          <span>تغییرات با موفقیت ذخیره شدند.</span>
        </output>
      )}

      {/* ── Footer ────────────────────────────────────────────────── */}
      {canEdit && (
        <div className={s.footer}>
          <button
            type="submit"
            className={`${s.btn} ${s.btnPrimary}`}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            ) : (
              <Save size={14} aria-hidden />
            )}
            {isPending ? 'در حال ذخیره…' : 'ذخیره پروفایل'}
          </button>
        </div>
      )}
    </form>
  );
}

function HoursRow({
  day,
  value,
  onChange,
  disabled,
}: {
  day: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <span className={s.hoursLabel}>{day}</span>
      <input
        type="text"
        className={s.hoursInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        maxLength={20}
        placeholder="08:00-16:00 یا تعطیل"
        aria-label={`ساعت کاری ${day}`}
        style={{ gridColumn: 'span 2' }}
      />
    </>
  );
}
