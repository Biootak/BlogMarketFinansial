'use client';

/**
 * SettingsWorkspace — ویرایش اطلاعات صرافی توسط OWNER/MANAGER.
 *
 * فرم ویرایش: نام، شهر، آدرس، تلفن، ایمیل، مجوز، تنظیمات KYC و حد روزانه.
 */

import { type ExchangeRow, updateExchangeSelf } from '@/actions/exchanges';
import { FormField } from '@/components/Dashboard/primitives';
import { Building2, CheckCircle2, Info, Loader2, Save, Shield, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import s from './SettingsWorkspace.module.css';

interface Props {
  exchange: ExchangeRow;
  staffRole: string;
}

export default function SettingsWorkspace({ exchange, staffRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // فرم state
  const [name, setName] = useState(exchange.name);
  const [city, setCity] = useState(exchange.city ?? '');
  const [address, setAddress] = useState(exchange.address ?? '');
  const [phone, setPhone] = useState(exchange.phone ?? '');
  const [email, setEmail] = useState(exchange.email ?? '');
  const [licenseNo, setLicenseNo] = useState(exchange.licenseNo ?? '');
  const [requireKyc, setRequireKyc] = useState(exchange.requireKyc);
  const [dailyLimitAf, setDailyLimitAf] = useState(String(exchange.dailyLimitAf));

  const canEdit = ['OWNER', 'MANAGER'].includes(staffRole);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setError(null);
    setSaved(false);

    const limitVal = Number(dailyLimitAf);
    if (!Number.isFinite(limitVal) || limitVal < 0) {
      setError('حد روزانه نامعتبر است');
      return;
    }

    startTransition(async () => {
      const res = await updateExchangeSelf(exchange.id, {
        name: name.trim() || exchange.name,
        city: city.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        licenseNo: licenseNo.trim() || null,
        requireKyc,
        dailyLimitAf: Math.round(limitVal),
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
      {/* بنر اطلاعات */}
      <div className={s.infoCard}>
        <Info className={s.infoIcon} aria-hidden />
        <p className={s.infoText}>
          اطلاعات پایه صرافی شما. تغییرات پس از ذخیره در پنل و صفحات عمومی نمایش داده می‌شوند.
          {!canEdit && (
            <strong className={s.readonlyNote}>
              {' '}
              — شما دسترسی مشاهده دارید، ویرایش فقط توسط مالک یا مدیر انجام می‌شود.
            </strong>
          )}
        </p>
      </div>

      {/* ─── اطلاعات پایه ─────────────────────────────────────────────────────── */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <Building2 className="w-4 h-4" style={{ color: 'var(--at-accent)' }} aria-hidden />
          <span>اطلاعات پایه</span>
        </div>
        <div className={s.grid}>
          <FormField label="نام صرافی" required>
            <input
              className={s.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
              maxLength={120}
              aria-label="نام صرافی"
            />
          </FormField>
          <FormField label="شماره مجوز">
            <input
              className={s.input}
              value={licenseNo}
              onChange={(e) => setLicenseNo(e.target.value)}
              disabled={!canEdit}
              maxLength={60}
              dir="ltr"
              placeholder="شماره مجوز تجاری"
            />
          </FormField>
          <FormField label="شهر">
            <input
              className={s.input}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!canEdit}
              maxLength={80}
              placeholder="هرات، کابل، مزارشریف…"
            />
          </FormField>
          <FormField label="آدرس">
            <input
              className={s.input}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={!canEdit}
              maxLength={300}
              placeholder="آدرس کامل"
            />
          </FormField>
        </div>
      </section>

      {/* ─── اطلاعات تماس ─────────────────────────────────────────────────────── */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <span>اطلاعات تماس</span>
        </div>
        <div className={s.grid}>
          <FormField label="شماره تلفن">
            <input
              className={s.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!canEdit}
              maxLength={30}
              dir="ltr"
              type="tel"
              placeholder="+93…"
            />
          </FormField>
          <FormField label="ایمیل">
            <input
              className={s.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!canEdit}
              maxLength={120}
              dir="ltr"
              type="email"
              placeholder="info@exchange.af"
            />
          </FormField>
        </div>
      </section>

      {/* ─── تنظیمات عملیاتی ──────────────────────────────────────────────────── */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <Shield className="w-4 h-4" style={{ color: 'var(--at-accent)' }} aria-hidden />
          <span>تنظیمات عملیاتی</span>
        </div>

        <div className={s.grid}>
          <FormField
            label="حد روزانه تراکنش (افغانی)"
            hint="حداکثر مجموع تراکنش‌های روزانه هر مشتری — ۰ یعنی بدون محدودیت"
          >
            <input
              className={s.input}
              value={dailyLimitAf}
              onChange={(e) => setDailyLimitAf(e.target.value)}
              disabled={!canEdit}
              type="number"
              min="0"
              step="1000"
              dir="ltr"
            />
          </FormField>
        </div>

        {/* KYC toggle */}
        <div className={s.toggleRow}>
          <div className={s.toggleInfo}>
            <p className={s.toggleLabel}>الزام KYC مشتریان</p>
            <p className={s.toggleHint}>
              اگر فعال باشد، تراکنش‌های بالاتر از حد مشخص نیاز به تأیید هویت دارند.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={requireKyc}
            className={`${s.toggle} ${requireKyc ? s.toggleOn : s.toggleOff}`}
            onClick={() => canEdit && setRequireKyc((v) => !v)}
            disabled={!canEdit}
            aria-label={requireKyc ? 'KYC فعال است' : 'KYC غیرفعال است'}
          >
            <span className={s.toggleThumb} />
          </button>
        </div>
      </section>

      {/* ─── وضعیت صرافی (read-only) ──────────────────────────────────────────── */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <span>وضعیت فعلی</span>
        </div>
        <div className={s.statusRow}>
          <div className={s.statusItem}>
            <span className={s.statusItemLabel}>وضعیت</span>
            <span
              className={`${s.statusBadge} ${exchange.status === 'ACTIVE' ? s.statusActive : s.statusOther}`}
            >
              {exchange.status === 'ACTIVE'
                ? 'فعال'
                : exchange.status === 'PENDING'
                  ? 'در انتظار تأیید'
                  : exchange.status === 'SUSPENDED'
                    ? 'معلق'
                    : 'بسته'}
            </span>
          </div>
          <div className={s.statusItem}>
            <span className={s.statusItemLabel}>slug</span>
            <span className={s.statusItemValue} dir="ltr">
              {exchange.slug}
            </span>
          </div>
          <div className={s.statusItem}>
            <span className={s.statusItemLabel}>کارمزد پلتفرم</span>
            <span className={s.statusItemValue}>{exchange.platformFee}٪</span>
          </div>
          <div className={s.statusItem}>
            <span className={s.statusItemLabel}>تاریخ ثبت</span>
            <span className={s.statusItemValue}>
              {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(
                new Date(exchange.createdAt),
              )}
            </span>
          </div>
        </div>
      </section>

      {/* خطا */}
      {error && (
        <div className={s.errorBanner} role="alert">
          <XCircle className="w-4 h-4" aria-hidden />
          {error}
        </div>
      )}

      {/* موفقیت */}
      {saved && (
        <output className={s.successBanner}>
          <CheckCircle2 className="w-4 h-4" aria-hidden />
          تنظیمات با موفقیت ذخیره شدند.
        </output>
      )}

      {/* دکمه ذخیره */}
      {canEdit && (
        <div className={s.footerActions}>
          <button type="submit" className={s.saveBtn} disabled={isPending} aria-busy={isPending}>
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Save className="w-4 h-4" aria-hidden />
            )}
            {isPending ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}
          </button>
        </div>
      )}
    </form>
  );
}
