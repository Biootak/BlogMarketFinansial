'use client';

import { type BillingAddressData, saveBillingAddress } from '@/actions/billingAddressActions';
import { PageHeader } from '@/components/Dashboard/primitives';
import {
  AlertCircle,
  Building2,
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
];

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

  const set =
    (key: keyof BillingAddressData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
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

  return (
    <div className={s.page} dir="rtl">
      <PageHeader
        variant="strip"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'آدرس صورتحساب' }]}
        eyebrow="صورتحساب"
        title="آدرس صورتحساب"
        description="آدرسی که فاکتورها و صورتحساب‌های دوره‌ای به آن ارسال می‌شود"
      />

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

      <form onSubmit={handleSubmit}>
        <div className={s.formCard}>
          {/* ── Header ── */}
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

          {/* ── Fields ── */}
          <div className={s.formCardBody}>
            <div className={s.grid}>
              {/* نام گیرنده */}
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

              {/* شماره تماس */}
              <label className={s.field}>
                <span className={s.label}>
                  <Phone size={14} className={s.labelIcon} aria-hidden />
                  شماره تماس
                </span>
                <input
                  type="tel"
                  dir="ltr"
                  className={s.input}
                  placeholder="+93700000000"
                  value={form.phoneNumber ?? ''}
                  onChange={set('phoneNumber')}
                />
              </label>

              {/* کشور */}
              <label className={s.field}>
                <span className={s.label}>
                  <MapPin size={14} className={s.labelIcon} data-color="emerald" aria-hidden />
                  کشور
                </span>
                <select className={s.select} value={form.country ?? 'af'} onChange={set('country')}>
                  {COUNTRIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* استان / ولایت */}
              <label className={s.field}>
                <span className={s.label}>
                  <Building2 size={14} className={s.labelIcon} data-color="blue" aria-hidden />
                  استان / ولایت
                </span>
                <input
                  type="text"
                  className={s.input}
                  placeholder="مثلاً: کابل"
                  value={form.province ?? ''}
                  onChange={set('province')}
                />
              </label>

              {/* شهر */}
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

              {/* کد پستی */}
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

              {/* آدرس کامل — full width */}
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

          {/* ── Footer ── */}
          <div className={s.formFooter}>
            <button type="button" className={s.btnGhost} onClick={handleReset} disabled={isPending}>
              انصراف
            </button>
            <button type="submit" disabled={isPending} className={s.btnPrimary}>
              {isPending ? (
                <>
                  <Loader2 size={15} className={s.spinner} aria-hidden />
                  در حال ذخیره...
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
    </div>
  );
}
