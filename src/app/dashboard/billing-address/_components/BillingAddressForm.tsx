'use client';

import { type BillingAddressData, saveBillingAddress } from '@/actions/billingAddressActions';
import { PageHeader } from '@/components/Dashboard/primitives';
import {
  HiOutlineBuildingOffice2,
  HiOutlineCheck,
  HiOutlineEnvelope,
  HiOutlineHome,
  HiOutlineMapPin,
  HiOutlinePhone,
  HiOutlineUser,
} from 'react-icons/hi2';
import { useCallback, useState, useTransition } from 'react';

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

  const set = (key: keyof BillingAddressData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setSaved(false);
    setError(null);
  };

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
    <>
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'آدرس صورتحساب' }]}
        eyebrow="صورتحساب"
        title="آدرس صورتحساب"
        description="آدرسی که فاکتورها و صورتحساب‌های دوره‌ای به آن ارسال می‌شود"
      />

      <form onSubmit={handleSubmit} className="at-form">
        {error && (
          <div className="at-alert at-alert--error" role="alert">
            {error}
          </div>
        )}
        {saved && (
          <div className="at-alert at-alert--success" role="status">
            آدرس با موفقیت ذخیره شد.
          </div>
        )}

        <div className="at-form-section">
          <div className="at-form-section__head">
            <div className="at-form-section__title">
              <span className="at-form-section__ico">
                <HiOutlineMapPin className="size-4" />
              </span>
              <div>
                <div className="at-form-section__title-text">آدرس</div>
                <div className="at-form-section__sub">اطلاعات برای صدور فاکتور رسمی استفاده می‌شود</div>
              </div>
            </div>
          </div>

          <div className="at-form-section__body">
            <div className="at-form-grid">
              <label className="at-field">
                <span className="at-field__label">
                  <HiOutlineUser className="at-field__ico size-4" />
                  نام گیرنده
                </span>
                <input
                  type="text"
                  className="at-input"
                  placeholder="نام و نام خانوادگی"
                  value={form.recipientName ?? ''}
                  onChange={set('recipientName')}
                />
              </label>

              <label className="at-field">
                <span className="at-field__label">
                  <HiOutlinePhone className="at-field__ico size-4" />
                  شماره تماس
                </span>
                <input
                  type="tel"
                  dir="ltr"
                  className="at-input"
                  placeholder="+93700000000"
                  value={form.phoneNumber ?? ''}
                  onChange={set('phoneNumber')}
                />
              </label>

              <label className="at-field">
                <span className="at-field__label">
                  <HiOutlineMapPin className="at-field__ico at-field__ico--emerald size-4" />
                  کشور
                </span>
                <select className="at-select" value={form.country ?? 'af'} onChange={set('country')}>
                  {COUNTRIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>

              <label className="at-field">
                <span className="at-field__label">
                  <HiOutlineBuildingOffice2 className="at-field__ico at-field__ico--blue size-4" />
                  استان / ولایت
                </span>
                <input
                  type="text"
                  className="at-input"
                  placeholder="مثلاً: کابل"
                  value={form.province ?? ''}
                  onChange={set('province')}
                />
              </label>

              <label className="at-field">
                <span className="at-field__label">
                  <HiOutlineBuildingOffice2 className="at-field__ico size-4" />
                  شهر
                </span>
                <input
                  type="text"
                  className="at-input"
                  placeholder="مثلاً: کابل"
                  value={form.city ?? ''}
                  onChange={set('city')}
                />
              </label>

              <label className="at-field">
                <span className="at-field__label">
                  <HiOutlineHome className="at-field__ico size-4" />
                  آدرس کامل
                </span>
                <input
                  type="text"
                  className="at-input"
                  placeholder="خیابان، کوچه، پلاک"
                  value={form.address ?? ''}
                  onChange={set('address')}
                />
              </label>

              <label className="at-field">
                <span className="at-field__label">
                  <HiOutlineEnvelope className="at-field__ico size-4" />
                  کد پستی
                </span>
                <input
                  type="text"
                  dir="ltr"
                  className="at-input"
                  placeholder="کد پستی"
                  value={form.postalCode ?? ''}
                  onChange={set('postalCode')}
                />
              </label>
            </div>
          </div>
        </div>

        <div
          className="at-form-section"
          style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '14px 20px' }}
        >
          <button type="button" className="at-btn at-btn--ghost" onClick={() => setForm({ country: initial?.country ?? 'af', province: initial?.province ?? '', city: initial?.city ?? '', address: initial?.address ?? '', postalCode: initial?.postalCode ?? '', recipientName: initial?.recipientName ?? '', phoneNumber: initial?.phoneNumber ?? '' })}>
            انصراف
          </button>
          <button type="submit" disabled={isPending} className="at-btn at-btn--primary">
            <HiOutlineCheck className="size-4" />
            {isPending ? 'در حال ذخیره...' : 'ذخیره آدرس'}
          </button>
        </div>
      </form>
    </>
  );
}
