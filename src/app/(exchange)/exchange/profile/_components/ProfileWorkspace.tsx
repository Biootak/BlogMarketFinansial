'use client';

/**
 * ProfileWorkspace — ویرایش پروفایل عمومی صرافی.
 *
 *   ساختار P2026:
 *   ─────────────────────────────────────────────────────────
 *   1. ExchangeIdentityCard (signature) — نام، لوگو، وضعیت، counters
 *   2. Identity Section  — نام رسمی/نمایشی، شهر، آدرس، مختصات
 *   3. Logo & Brand Section — URL لوگو + preview + aspect ratio
 *   4. Contact Section — تلفن، ایمیل، وبسایت
 *   5. Working Hours Section — HoursMatrix (7 روز)
 *   6. Audit meta — createdAt/updatedAt
 *   ─────────────────────────────────────────────────────────
 *
 *   UX: StickySaveBar که خودکار با تغییرات ظاهر می‌شود.
 *   Validation: سمت client قبل از ارسال به server action.
 */

import {
  ExchangeIdentityCard,
  HoursMatrix,
  SettingsField,
  SettingsSurfaceCard,
  StickySaveBar,
  type HoursValue,
} from '@/components/Dashboard/primitives';
import { type ExchangeRow, updateExchangeSelf } from '@/actions/exchanges';
import {
  Building2,
  Clock,
  Globe,
  Info,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import s from './ProfileWorkspace.module.css';
import LogoUploader from './LogoUploader';

type Props = {
  exchange: ExchangeRow;
  canEdit: boolean;
};

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const DAYS: ReadonlyArray<{ key: keyof HoursMap; label: string }> = [
  { key: 'sat', label: 'شنبه' },
  { key: 'sun', label: 'یکشنبه' },
  { key: 'mon', label: 'دوشنبه' },
  { key: 'tue', label: 'سه‌شنبه' },
  { key: 'wed', label: 'چهارشنبه' },
  { key: 'thu', label: 'پنجشنبه' },
  { key: 'fri', label: 'جمعه' },
];

type HoursMap = {
  sat: HoursValue;
  sun: HoursValue;
  mon: HoursValue;
  tue: HoursValue;
  wed: HoursValue;
  thu: HoursValue;
  fri: HoursValue;
};

const DEFAULT_HOURS: HoursMap = {
  sat: { open: '08:00', close: '16:00', closed: false },
  sun: { open: '08:00', close: '16:00', closed: false },
  mon: { open: '08:00', close: '16:00', closed: false },
  tue: { open: '08:00', close: '16:00', closed: false },
  wed: { open: '08:00', close: '16:00', closed: false },
  thu: { open: '08:00', close: '16:00', closed: false },
  fri: { open: '00:00', close: '00:00', closed: true },
};

/** legacy: HOURS=JSON در address (برای backward compat) */
function parseHours(address: string | null): HoursMap {
  if (!address) return DEFAULT_HOURS;
  const marker = ';HOURS=';
  const idx = address.indexOf(marker);
  if (idx === -1) return DEFAULT_HOURS;
  const raw = address.slice(idx + marker.length);
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof HoursMap, Partial<HoursValue>>>;
    const merged = { ...DEFAULT_HOURS };
    for (const k of DAYS) {
      const v = parsed[k.key];
      if (v && typeof v === 'object') merged[k.key] = { ...merged[k.key], ...v };
    }
    return merged;
  } catch {
    return DEFAULT_HOURS;
  }
}

function packHours(visibleAddress: string, hours: HoursMap): string {
  const base = visibleAddress.trim();
  return `${base};HOURS=${JSON.stringify(hours)}`;
}

function visibleAddress(address: string | null): string {
  if (!address) return '';
  const idx = address.indexOf(';HOURS=');
  return idx === -1 ? address : address.slice(0, idx);
}

export default function ProfileWorkspace({ exchange, canEdit }: Props) {
  const router = useRouter();

  // ── State ─────────────────────────────────────────────────────────
  const [name, setName] = useState(exchange.name);
  const [displayName, setDisplayName] = useState(exchange.displayName ?? exchange.name);
  const [phone, setPhone] = useState(exchange.phone ?? '');
  const [email, setEmail] = useState(exchange.email ?? '');
  const [city, setCity] = useState(exchange.city ?? '');
  const [address, setAddress] = useState(visibleAddress(exchange.address));
  const [logoUrl, setLogoUrl] = useState(exchange.logoUrl ?? '');
  const [website, setWebsite] = useState(exchange.website ?? '');
  const [hours, setHours] = useState<HoursMap>(() => parseHours(exchange.address));

  // ── Dirty tracking ────────────────────────────────────────────────
  const initial = useRef({
    name: exchange.name,
    displayName: exchange.displayName ?? exchange.name,
    phone: exchange.phone ?? '',
    email: exchange.email ?? '',
    city: exchange.city ?? '',
    address: visibleAddress(exchange.address),
    logoUrl: exchange.logoUrl ?? '',
    website: exchange.website ?? '',
    hours: parseHours(exchange.address),
  });

  const dirtyCount = useMemo(() => {
    let n = 0;
    if (name.trim() !== initial.current.name.trim()) n++;
    if (displayName.trim() !== initial.current.displayName.trim()) n++;
    if (phone.trim() !== initial.current.phone.trim()) n++;
    if (email.trim() !== initial.current.email.trim()) n++;
    if (city.trim() !== initial.current.city.trim()) n++;
    if (address.trim() !== initial.current.address.trim()) n++;
    if (logoUrl.trim() !== initial.current.logoUrl.trim()) n++;
    if (website.trim() !== initial.current.website.trim()) n++;
    if (JSON.stringify(hours) !== JSON.stringify(initial.current.hours)) n++;
    return n;
  }, [name, displayName, phone, email, city, address, logoUrl, website, hours]);

  // ── Save flow ─────────────────────────────────────────────────────
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = () => {
    setName(initial.current.name);
    setDisplayName(initial.current.displayName);
    setPhone(initial.current.phone);
    setEmail(initial.current.email);
    setCity(initial.current.city);
    setAddress(initial.current.address);
    setLogoUrl(initial.current.logoUrl);
    setWebsite(initial.current.website);
    setHours(initial.current.hours);
    setStatus('idle');
    setErrorMessage(null);
  };

  const handleSave = () => {
    if (!canEdit) return;
    setErrorMessage(null);

    // Validation
    if (name.trim().length < 2) {
      setStatus('error');
      setErrorMessage('نام صرافی باید حداقل ۲ کاراکتر باشد');
      return;
    }
    if (displayName.trim().length > 120) {
      setStatus('error');
      setErrorMessage('نام نمایشی نباید بیش از ۱۲۰ کاراکتر باشد');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus('error');
      setErrorMessage('ایمیل نامعتبر است');
      return;
    }
    if (website.trim() && !/^https?:\/\//i.test(website.trim())) {
      setStatus('error');
      setErrorMessage('آدرس وبسایت باید با http یا https شروع شود');
      return;
    }
    if (logoUrl.trim() && !/^https?:\/\//i.test(logoUrl.trim())) {
      setStatus('error');
      setErrorMessage('آدرس لوگو باید با http یا https شروع شود');
      return;
    }

    setStatus('saving');
    void (async () => {
      const res = await updateExchangeSelf(exchange.id, {
        name: name.trim(),
        displayName: displayName.trim() || null,
        city: city.trim() || null,
        address: packHours(address, hours),
        phone: phone.trim() || null,
        email: email.trim() || null,
        logoUrl: logoUrl.trim() || null,
        website: website.trim() || null,
      });

      if (res.success) {
        initial.current = {
          name,
          displayName,
          phone,
          email,
          city,
          address,
          logoUrl,
          website,
          hours,
        };
        setStatus('saved');
        router.refresh();
      } else {
        setStatus('error');
        setErrorMessage(res.error.message);
      }
    })();
  };

  // trigger dirty when changes happen
  if (status === 'idle' && dirtyCount > 0 && canEdit) {
    setStatus('dirty');
  }

  return (
    <>
      <div className={s.shell}>
        {/* ── 1. Identity Card (signature moment) ───────────────────── */}
        <ExchangeIdentityCard
          exchange={exchange}
          publicUrl={`/exchanges/${exchange.slug}`}
          counters={[
            { label: 'مشتری', value: exchange._count?.Customer ?? 0 },
            { label: 'تراکنش', value: exchange._count?.Transaction ?? 0 },
          ]}
        />

        {/* ── Info banner ───────────────────────────────────────────── */}
        <div className={s.banner} role="note">
          <Info size={15} className={s.bannerIcon} aria-hidden />
          <div className={s.bannerText}>
            <strong>این اطلاعات در صفحه عمومی صرافی شما نمایش داده می‌شود.</strong>
            <span>
              برای تنظیمات عملیاتی (KYC، کارمزد، حد تراکنش) به{' '}
              <a href="/exchange/settings" className={s.bannerLink}>
                تنظیمات
              </a>{' '}
              بروید.
            </span>
            {!canEdit && (
              <span className={s.bannerWarn}>
                <ShieldCheck size={11} aria-hidden /> شما دسترسی ویرایش ندارید.
              </span>
            )}
          </div>
        </div>

        {/* ── 2. Identity section ───────────────────────────────────── */}
        <SettingsSurfaceCard
          id="profile-identity"
          title="هویت صرافی"
          description="نام رسمی و نام نمایشی که در صفحهٔ عمومی نمایش داده می‌شود"
          icon={Building2}
          tone="accent"
          headerActions={
            <span className={s.charCount}>
              {name.trim().length}
              <span className={s.charDim}>/120</span>
            </span>
          }
        >
          <div className={s.grid2}>
            <SettingsField
              label="نام رسمی"
              hint="نام ثبت‌شده در مجوز رسمی"
              tag={{ label: 'الزامی', tone: 'required' }}
              span={1}
            >
              <input
                className={s.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit}
                maxLength={120}
                aria-label="نام رسمی صرافی"
              />
            </SettingsField>
            <SettingsField
              label="نام نمایشی"
              hint="در صفحه صرافی و تبلیغات نمایش داده می‌شود"
              tag={{ label: 'پیشنهادی', tone: 'recommended' }}
              span={1}
            >
              <input
                className={s.input}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={!canEdit}
                maxLength={120}
                placeholder="همان نام رسمی"
                aria-label="نام نمایشی صرافی"
              />
            </SettingsField>
          </div>
        </SettingsSurfaceCard>

        {/* ── 3. Logo section ───────────────────────────────────────── */}
        <SettingsSurfaceCard
          id="profile-logo"
          title="لوگو و برند"
          description="نشان‌واره‌ای که در کارت‌ها، اعلان‌ها و لیست مشتریان نمایش داده می‌شود"
          icon={Globe}
          tone="violet"
        >
          <LogoUploader
            value={logoUrl}
            onUploaded={(url) => setLogoUrl(url)}
            onRemoved={() => setLogoUrl('')}
            disabled={!canEdit}
          />
          <p className={s.logoHint}>
            <Info size={11} aria-hidden />
            تصویر لوگو در صفحهٔ عمومی، کارت تراکنش‌ها و گزارش‌های PDF استفاده می‌شود.
            برای نتیجهٔ بهتر، از تصویر مربعی PNG یا WebP با حداقل ۲۵۶×۲۵۶ پیکسل استفاده کنید.
          </p>
        </SettingsSurfaceCard>

        {/* ── 4. Contact section ────────────────────────────────────── */}
        <SettingsSurfaceCard
          id="profile-contact"
          title="اطلاعات تماس"
          description="راه‌های ارتباطی که مشتریان برای پیگیری استفاده می‌کنند"
          icon={Phone}
          tone="info"
        >
          <div className={s.grid2}>
            <SettingsField label="شهر" hint="شهر اصلی فعالیت" span={1}>
              <div className={s.inputIconWrap}>
                <MapPin size={13} className={s.inputIcon} aria-hidden />
                <input
                  className={`${s.input} ${s.inputIconPad}`}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!canEdit}
                  maxLength={80}
                  placeholder="هرات، کابل، مزار شریف…"
                  aria-label="شهر"
                />
              </div>
            </SettingsField>
            <SettingsField label="تلفن" hint="شمارهٔ اصلی صرافی" span={1}>
              <div className={s.inputIconWrap}>
                <Phone size={13} className={s.inputIcon} aria-hidden />
                <input
                  className={`${s.input} ${s.inputLtr} ${s.inputIconPad}`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!canEdit}
                  maxLength={30}
                  type="tel"
                  placeholder="+93 700 000 000"
                  aria-label="تلفن"
                />
              </div>
            </SettingsField>
            <SettingsField label="ایمیل" hint="آدرس ایمیل رسمی" span={1}>
              <div className={s.inputIconWrap}>
                <Mail size={13} className={s.inputIcon} aria-hidden />
                <input
                  className={`${s.input} ${s.inputLtr} ${s.inputIconPad}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!canEdit}
                  maxLength={120}
                  type="email"
                  placeholder="info@exchange.af"
                  aria-label="ایمیل"
                />
              </div>
            </SettingsField>
            <SettingsField label="وبسایت" hint="آدرس کامل با http یا https" span={1}>
              <div className={s.inputIconWrap}>
                <Globe size={13} className={s.inputIcon} aria-hidden />
                <input
                  className={`${s.input} ${s.inputLtr} ${s.inputIconPad}`}
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  disabled={!canEdit}
                  maxLength={200}
                  type="url"
                  placeholder="https://example.com"
                  aria-label="وبسایت"
                />
              </div>
            </SettingsField>
            <SettingsField
              label="آدرس دفتر"
              hint="آدرس کامل فیزیکی — در صفحهٔ عمومی نمایش داده می‌شود"
              span="full"
            >
              <textarea
                className={s.textarea}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!canEdit}
                maxLength={280}
                rows={3}
                placeholder="خیابان، منطقه، نمایشگاه…"
                aria-label="آدرس دفتر"
              />
            </SettingsField>
          </div>
        </SettingsSurfaceCard>

        {/* ── 5. Working hours section ──────────────────────────────── */}
        <SettingsSurfaceCard
          id="profile-hours"
          title="ساعات کاری"
          description="تعیین کنید صرافی در چه روزها و ساعاتی به مشتریان خدمات می‌دهد"
          icon={Clock}
          tone="gold"
        >
          <HoursMatrix
            value={hours}
            onChange={(key, val) => setHours((p) => ({ ...p, [key]: val }))}
            disabled={!canEdit}
          />
        </SettingsSurfaceCard>
      </div>

      {canEdit && (
        <StickySaveBar
          status={status}
          dirtyCount={dirtyCount}
          errorMessage={errorMessage}
          onSave={handleSave}
          onDiscard={reset}
        />
      )}
    </>
  );
}

// Re-export so server pages can use the type
export type { ExchangeRow };
