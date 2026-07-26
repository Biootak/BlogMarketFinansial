'use client';

import { updateCustomerProfile } from '@/actions/customer-portal';
import type { CustomerProfile } from '@/actions/customer-portal';
import { Section } from '@/components/Dashboard/primitives';
import { CheckCircle2, Edit2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import s from './ProfileContent.module.css';

interface Props {
  profile: CustomerProfile;
}

const STATUS_LABEL: Record<string, string> = {
  PROSPECT: 'در انتظار فعال‌سازی',
  ACTIVE: 'فعال',
  FROZEN: 'منجمد',
  CLOSED: 'بسته',
};

const KYC_LEVEL_LABEL: Record<string, string> = {
  NONE: 'بدون تأیید',
  LEVEL_1: 'سطح ۱',
  LEVEL_2: 'سطح ۲',
  LEVEL_3: 'سطح ۳ — کامل',
};

export default function ProfileContent({ profile }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [email, setEmail] = useState(profile.email ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [address, setAddress] = useState(profile.address ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateCustomerProfile({
        email: email.trim() || null,
        city: city.trim() || null,
        address: address.trim() || null,
      });

      if (!result.success) {
        setError(result.error ?? 'خطایی رخ داده است');
      } else {
        setSaved(true);
        setEditing(false);
        router.refresh();
      }
    });
  }

  return (
    <div className={s.root}>
      {/* Identity info — read-only */}
      <Section title="اطلاعات هویتی">
        <div className={s.infoGrid}>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>نام کامل</span>
            <span className={s.infoValue}>{profile.fullName}</span>
          </div>
          {profile.fatherName && (
            <div className={s.infoRow}>
              <span className={s.infoLabel}>نام پدر</span>
              <span className={s.infoValue}>{profile.fatherName}</span>
            </div>
          )}
          <div className={s.infoRow}>
            <span className={s.infoLabel}>شماره موبایل</span>
            <span className={s.infoValue} dir="ltr">
              {profile.phone}
            </span>
          </div>
          {profile.nationalId && (
            <div className={s.infoRow}>
              <span className={s.infoLabel}>کد ملی / شناسه</span>
              <span className={s.infoValue} dir="ltr">
                {profile.nationalId}
              </span>
            </div>
          )}
          {profile.passportNo && (
            <div className={s.infoRow}>
              <span className={s.infoLabel}>شماره پاسپورت</span>
              <span className={s.infoValue} dir="ltr">
                {profile.passportNo}
              </span>
            </div>
          )}
          <div className={s.infoRow}>
            <span className={s.infoLabel}>وضعیت حساب</span>
            <span className={s.statusBadge} data-status={profile.status}>
              {STATUS_LABEL[profile.status] ?? profile.status}
            </span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>سطح KYC</span>
            <span className={s.infoValue}>
              {KYC_LEVEL_LABEL[profile.kycLevel] ?? profile.kycLevel}
            </span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>عضویت از</span>
            <span className={s.infoValue}>
              {new Intl.DateTimeFormat('fa-IR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }).format(profile.createdAt)}
            </span>
          </div>
        </div>
        <p className={s.readOnlyNote}>اطلاعات هویتی برای تغییر نیازمند تماس با صرافی است</p>
      </Section>

      {/* Contact info — editable */}
      <Section
        title="اطلاعات تماس"
        actions={
          !editing ? (
            <button type="button" className={s.editBtn} onClick={() => setEditing(true)}>
              <Edit2 className="w-3.5 h-3.5" aria-hidden />
              ویرایش
            </button>
          ) : undefined
        }
      >
        {editing ? (
          <form onSubmit={handleSubmit} className={s.form} noValidate>
            <div className={s.formRow}>
              <label htmlFor="email" className={s.label}>
                ایمیل
              </label>
              <input
                id="email"
                type="email"
                className={s.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                dir="ltr"
                disabled={isPending}
                autoComplete="email"
                maxLength={120}
              />
            </div>
            <div className={s.formRow}>
              <label htmlFor="city" className={s.label}>
                شهر
              </label>
              <input
                id="city"
                type="text"
                className={s.input}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="نام شهر"
                disabled={isPending}
                maxLength={80}
              />
            </div>
            <div className={s.formRow}>
              <label htmlFor="address" className={s.label}>
                آدرس
              </label>
              <textarea
                id="address"
                className={`${s.input} ${s.textarea}`}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="آدرس کامل..."
                disabled={isPending}
                rows={3}
                maxLength={300}
              />
            </div>

            {error && (
              <p className={s.errorText} role="alert">
                {error}
              </p>
            )}

            <div className={s.formActions}>
              <button
                type="button"
                className={s.cancelBtn}
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
                disabled={isPending}
              >
                انصراف
              </button>
              <button type="submit" className={s.saveBtn} disabled={isPending}>
                {isPending ? 'در حال ذخیره...' : 'ذخیره'}
              </button>
            </div>
          </form>
        ) : (
          <div className={s.infoGrid}>
            {saved && (
              <div className={s.savedBanner} role="status">
                <CheckCircle2 className="w-4 h-4" aria-hidden />
                تغییرات ذخیره شد
              </div>
            )}
            <div className={s.infoRow}>
              <span className={s.infoLabel}>ایمیل</span>
              <span className={s.infoValue} dir="ltr">
                {profile.email ?? '—'}
              </span>
            </div>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>شهر</span>
              <span className={s.infoValue}>{profile.city ?? '—'}</span>
            </div>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>آدرس</span>
              <span className={s.infoValue}>{profile.address ?? '—'}</span>
            </div>
          </div>
        )}
      </Section>

      {/* Exchange info */}
      <Section title="صرافی">
        <div className={s.infoGrid}>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>نام صرافی</span>
            <span className={s.infoValue}>{profile.exchange.name}</span>
          </div>
          {profile.exchange.city && (
            <div className={s.infoRow}>
              <span className={s.infoLabel}>شهر صرافی</span>
              <span className={s.infoValue}>{profile.exchange.city}</span>
            </div>
          )}
          {profile.exchange.phone && (
            <div className={s.infoRow}>
              <span className={s.infoLabel}>تلفن</span>
              <span className={s.infoValue} dir="ltr">
                {profile.exchange.phone}
              </span>
            </div>
          )}
          {profile.personalLimitAf !== null && (
            <div className={s.infoRow}>
              <span className={s.infoLabel}>سقف روزانه</span>
              <span className={s.infoValue}>
                {new Intl.NumberFormat('fa-IR').format(profile.personalLimitAf)} AFN
              </span>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
