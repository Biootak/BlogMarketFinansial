'use client';

import { type BillingAddressData, saveBillingAddress } from '@/actions/billingAddressActions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';
import s from './BillingAddress.module.css';

type Props = { initial: BillingAddressData | null };

const COUNTRIES = [
  { value: 'af', label: 'افغانستان' },
  { value: 'ir', label: 'ایران' },
  { value: 'pk', label: 'پاکستان' },
  { value: 'ae', label: 'امارات متحده عربی' },
  { value: 'tr', label: 'ترکیه' },
  { value: 'gb', label: 'بریتانیا' },
  { value: 'de', label: 'آلمان' },
  { value: 'us', label: 'ایالات متحده' },
  { value: 'ca', label: 'کانادا' },
  { value: 'cn', label: 'چین' },
];

const AFGHANISTAN_PROVINCES = [
  'کابل',
  'هرات',
  'بلخ',
  'ننگرهار',
  'قندهار',
  'بامیان',
  'پکتیا',
  'فراه',
  'غزنی',
  'خوست',
  'لوگر',
  'پروان',
  'کاپیسا',
  'پروان',
  'سمنگان',
  'تخار',
  'جوزجان',
  'فاریاب',
  'سرپل',
  'بادغیس',
  'هرات',
  'نیمروز',
  'زابل',
  'کنر',
  'پکتیکا',
  'روزگ',
  'غور',
  'دایکندی',
  'بند امیر',
  'پروان',
  'واریخ',
  'لمرن',
  'پروان',
  'پروان',
  'پروان',
].filter((v, i, a) => a.indexOf(v) === i);

export function BillingAddressForm({ initial }: Props) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<BillingAddressData>({
    country: initial?.country ?? 'af',
    province: initial?.province ?? '',
    city: initial?.city ?? '',
    address: initial?.address ?? '',
    postalCode: initial?.postalCode ?? '',
    recipientName: initial?.recipientName ?? '',
    phoneNumber: initial?.phoneNumber ?? '',
  });

  const hasAddress = !!(initial && (initial.recipientName || initial.address));

  const set =
    (key: keyof BillingAddressData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      setSaved(false);
      setError(null);
    };

  const handleSelectChange = (key: keyof BillingAddressData) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setError(null);
  };

  const handleReset = useCallback(() => {
    setForm({
      country: initial?.country ?? 'af',
      province: initial?.province ?? '',
      city: initial?.city ?? '',
      address: initial?.address ?? '',
      postalCode: initial?.postalCode ?? '',
      recipientName: initial?.recipientName ?? '',
      phoneNumber: initial?.phoneNumber ?? '',
    });
    setSaved(false);
    setError(null);
  }, [initial]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSaved(false);
      startTransition(async () => {
        const res = await saveBillingAddress(form);
        if (!res.success) {
          setError(res.error.message);
        } else {
          setSaved(true);
        }
      });
    },
    [form],
  );

  const countryLabel = COUNTRIES.find((c) => c.value === form.country)?.label ?? 'افغانستان';

  return (
    <div className={s.page} dir="rtl">
      {/* ── Status Hero ── */}
      <div className={s.statusHero}>
        <div className={`${s.statusIconWrap} ${hasAddress ? s.hasAddress : ''}`}>
          <div className={s.ring} aria-hidden />
          <MapPin size={24} />
        </div>
        <div className={s.statusContent}>
          <h1 className={s.statusTitle}>
            {hasAddress ? 'آدرس صورتحساب ثبت شده' : 'آدرس صورتحساب ثبت نشده'}
          </h1>
          <p className={s.statusDesc}>
            {hasAddress
              ? 'آدرس فعلی شما برای دریافت فاکتورها استفاده می‌شود.'
              : 'برای صدور فاکتور رسمی، آدرس خود را ثبت کنید.'}
          </p>
        </div>
        <div className={`${s.statusBadge} ${hasAddress ? s.active : s.inactive}`}>
          {hasAddress ? (
            <span className={s.successCheck}>
              <Check size={12} />
            </span>
          ) : (
            <MapPin size={12} />
          )}
          {hasAddress ? 'فعال' : 'ثبت نشده'}
        </div>
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className={s.alertError} role="alert">
          <AlertCircle size={16} className={s.alertIcon} aria-hidden />
          <span>{error}</span>
        </div>
      )}
      {saved && (
        <div className={s.alertSuccess} aria-live="polite">
          <CheckCircle2 size={16} className={s.alertIcon} aria-hidden />
          <span>آدرس با موفقیت ذخیره شد.</span>
        </div>
      )}

      {/* ── Two Column Layout ── */}
      <div className={s.layout}>
        {/* ── Form (Right Column) ── */}
        <form onSubmit={handleSubmit}>
          <div className={s.formCard}>
            {/* Header */}
            <div className={s.formCardHead}>
              <div className={s.formCardHeadIcon} aria-hidden>
                <MapPin size={18} />
              </div>
              <div className={s.formCardHeadText}>
                <h2 className={s.formCardTitle}>اطلاعات آدرس</h2>
                <p className={s.formCardDesc}>
                  اطلاعات برای صدور فاکتور رسمی و ارسال رسیدها استفاده می‌شود.
                </p>
              </div>
            </div>

            {/* Fields */}
            <div className={s.formCardBody}>
              {/* Identity Section */}
              <div className={s.sectionLabel}>اطلاعات هویتی</div>
              <div className={s.grid}>
                <label className={s.field}>
                  <span className={s.label}>
                    <User size={14} className={s.labelIcon} aria-hidden />
                    نام گیرنده
                  </span>
                  <input
                    type="text"
                    className={s.input}
                    placeholder="نام و نام خانوادگی"
                    value={form.recipientName ?? ''}
                    onChange={set('recipientName')}
                    required
                  />
                </label>

                <label className={s.field}>
                  <span className={s.label}>
                    <Phone size={14} className={s.labelIcon} aria-hidden />
                    شماره تماس
                  </span>
                  <input
                    type="tel"
                    dir="ltr"
                    className={s.input}
                    placeholder="+93 70 000 0000"
                    value={form.phoneNumber ?? ''}
                    onChange={set('phoneNumber')}
                  />
                </label>
              </div>

              {/* Location Section */}
              <div className={s.sectionLabel}>موقعیت جغرافیایی</div>
              <div className={s.grid}>
                <label className={s.field} htmlFor="ba-country">
                  <span className={s.label}>
                    <MapPin size={14} className={s.labelIcon} data-color="emerald" aria-hidden />
                    کشور
                  </span>
                  <Select
                    value={form.country ?? 'af'}
                    onValueChange={handleSelectChange('country')}
                  >
                    <SelectTrigger id="ba-country" className={s.input}>
                      <SelectValue placeholder="انتخاب کشور" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                {form.country === 'af' && (
                  <label className={s.field} htmlFor="ba-province">
                    <span className={s.label}>
                      <Building2 size={14} className={s.labelIcon} data-color="blue" aria-hidden />
                      ولایت
                    </span>
                    <Select
                      value={form.province ?? ''}
                      onValueChange={handleSelectChange('province')}
                    >
                      <SelectTrigger id="ba-province" className={s.input}>
                        <SelectValue placeholder="انتخاب ولایت" />
                      </SelectTrigger>
                      <SelectContent>
                        {AFGHANISTAN_PROVINCES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                )}

                <label className={s.field}>
                  <span className={s.label}>
                    <Building2 size={14} className={s.labelIcon} aria-hidden />
                    شهر
                  </span>
                  <input
                    type="text"
                    className={s.input}
                    placeholder="مثلاً: کابل"
                    value={form.city ?? ''}
                    onChange={set('city')}
                  />
                </label>

                <label className={s.field}>
                  <span className={s.label}>
                    <Mail size={14} className={s.labelIcon} data-color="amber" aria-hidden />
                    کد پستی
                  </span>
                  <input
                    type="text"
                    dir="ltr"
                    className={s.input}
                    placeholder="کد پستی"
                    value={form.postalCode ?? ''}
                    onChange={set('postalCode')}
                  />
                </label>

                <label className={`${s.field} ${s.gridFull}`}>
                  <span className={s.label}>
                    <MapPin size={14} className={s.labelIcon} aria-hidden />
                    آدرس کامل
                  </span>
                  <input
                    type="text"
                    className={s.input}
                    placeholder="خیابان، کوچه، پلاک"
                    value={form.address ?? ''}
                    onChange={set('address')}
                  />
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className={s.formFooter}>
              <button
                type="button"
                className={s.btnGhost}
                onClick={handleReset}
                disabled={isPending}
              >
                انصراف
              </button>
              <button type="submit" disabled={isPending} className={s.btnPrimary}>
                {isPending ? (
                  <>
                    <Loader2 size={15} className={s.spinner} aria-hidden />
                    در حال ذخیره…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} aria-hidden />
                    ذخیره آدرس
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* ── Preview + Tips (Left Column) ── */}
        <div className={s.previewCard}>
          {/* Live Preview */}
          <div className={s.previewInner}>
            <div className={s.previewHead}>
              <MapPin size={16} className={s.previewHeadIcon} aria-hidden />
              <h3 className={s.previewHeadTitle}>پیش‌نمایش آدرس</h3>
            </div>
            <div className={s.previewBody}>
              <div className={s.previewRow}>
                <span className={s.previewLabel}>گیرنده</span>
                <span className={`${s.previewValue} ${!form.recipientName ? s.empty : ''}`}>
                  {form.recipientName || 'نام گیرنده...'}
                </span>
              </div>
              <div className={s.previewRow}>
                <span className={s.previewLabel}>تماس</span>
                <span
                  className={`${s.previewValue} ${!form.phoneNumber ? s.empty : ''}`}
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                >
                  {form.phoneNumber || 'شماره تماس...'}
                </span>
              </div>
              <div className={s.previewRow}>
                <span className={s.previewLabel}>موقعیت</span>
                <span
                  className={`${s.previewValue} ${!form.address && !form.province ? s.empty : ''}`}
                >
                  {[form.address, form.city, form.province, countryLabel]
                    .filter(Boolean)
                    .join(' · ') || 'آدرس...'}
                </span>
              </div>
              <div className={s.previewRow}>
                <span className={s.previewLabel}>کد پستی</span>
                <span
                  className={`${s.previewValue} ${!form.postalCode ? s.empty : ''}`}
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                >
                  {form.postalCode || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className={s.tipsCard}>
            <h4 className={s.tipsTitle}>
              <MapPin size={14} />
              نکات مهم
            </h4>
            <ul className={s.tipsList}>
              <li>آدرس صورتحساب برای صدور فاکتور رسمی استفاده می‌شود.</li>
              <li>اطمینان حاصل کنید آدرس دقیق و قابل ارسال باشد.</li>
              <li>شماره تماس برای پیگیری ارسال فاکتور ضروری است.</li>
              <li>کد پستی اختیاری است ولی برای ارسال سریع‌تر کمک می‌کند.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
