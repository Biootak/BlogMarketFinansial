'use client';

/**
 * ExchangeDrawer — فرم ایجاد/ویرایش صرافی.
 * Portal mount، focus trap با keyboard navigation.
 */

import type { ExchangeRow } from '@/actions/exchanges';
import { FormField } from '@/components/Dashboard/primitives';
import { X } from 'lucide-react';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  initialData: ExchangeRow | null;
  saving: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

const input: CSSProperties = {
  width: '100%',
  height: '2.4rem',
  padding: '0 0.75rem',
  fontSize: 'var(--ds-text-sm)',
  color: 'var(--at-fg)',
  background: 'var(--at-canvas-subtle, var(--ds-canvas-subtle))',
  border: '1px solid var(--at-line)',
  borderRadius: '8px',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 120ms ease',
};

const select: CSSProperties = { ...input, cursor: 'pointer' };

export default function ExchangeDrawer({ open, initialData, saving, onClose, onSave }: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [slug, setSlug] = useState(initialData?.slug ?? '');
  const [licenseNo, setLicenseNo] = useState(initialData?.licenseNo ?? '');
  const [city, setCity] = useState(initialData?.city ?? '');
  const [address, setAddress] = useState(initialData?.address ?? '');
  const [phone, setPhone] = useState(initialData?.phone ?? '');
  const [email, setEmail] = useState(initialData?.email ?? '');
  const [platformFee, setPlatformFee] = useState(String(initialData?.platformFee ?? '0'));
  const [dailyLimitAf, setDailyLimitAf] = useState(
    String(initialData?.dailyLimitAf ? Number(initialData.dailyLimitAf) : 0),
  );
  const [status, setStatus] = useState<string>(initialData?.status ?? 'PENDING');
  const [requireKyc, setRequireKyc] = useState(initialData?.requireKyc ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstRef = useRef<HTMLInputElement>(null);

  // Bug-fix: وقتی drawer باز می‌شود، state را با initialData جدید sync کن
  // بدون این، بعد از edit یک row، باز کردن create form مقادیر قبلی را نشان می‌داد
  useEffect(() => {
    if (open) {
      setName(initialData?.name ?? '');
      setSlug(initialData?.slug ?? '');
      setLicenseNo(initialData?.licenseNo ?? '');
      setCity(initialData?.city ?? '');
      setAddress(initialData?.address ?? '');
      setPhone(initialData?.phone ?? '');
      setEmail(initialData?.email ?? '');
      setPlatformFee(String(initialData?.platformFee ?? '0'));
      setDailyLimitAf(String(initialData?.dailyLimitAf ? Number(initialData.dailyLimitAf) : 0));
      setStatus(initialData?.status ?? 'PENDING');
      setRequireKyc(initialData?.requireKyc ?? true);
      setErrors({});
      setTimeout(() => firstRef.current?.focus(), 60);
    }
  }, [open, initialData]);

  // ESC close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Auto-slug from name (ایجاد جدید)
  const handleNameChange = (v: string) => {
    setName(v);
    if (!initialData) {
      setSlug(
        v
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .slice(0, 60),
      );
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'نام الزامی است';
    if (!slug.trim()) errs.slug = 'slug الزامی است';
    if (!/^[a-z0-9-]+$/.test(slug)) errs.slug = 'فقط حروف انگلیسی کوچک، اعداد و خط تیره';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'ایمیل نامعتبر';
    const fee = Number.parseFloat(platformFee);
    if (Number.isNaN(fee) || fee < 0 || fee > 100)
      errs.platformFee = 'کارمزد باید بین ۰ تا ۱۰۰ باشد';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSave({
      name: name.trim(),
      slug: slug.trim(),
      licenseNo: licenseNo.trim() || null,
      city: city.trim() || null,
      address: address.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      platformFee: Number.parseFloat(platformFee) || 0,
      dailyLimitAf: Number.parseInt(dailyLimitAf) || 0,
      status,
      requireKyc,
    });
  };

  if (!open || typeof window === 'undefined') return null;

  const overlay: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
  };

  const panel: CSSProperties = {
    width: 'min(480px, 100vw)',
    height: '100%',
    overflowY: 'auto',
    background: 'var(--at-surface)',
    borderInlineStart: '1px solid var(--at-line)',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  };

  const hdr: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--at-line)',
    position: 'sticky',
    top: 0,
    background: 'var(--at-surface)',
    zIndex: 1,
  };

  const body: CSSProperties = {
    flex: 1,
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  };

  const ftr: CSSProperties = {
    padding: '1rem 1.5rem',
    borderTop: '1px solid var(--at-line)',
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-start',
    position: 'sticky',
    bottom: 0,
    background: 'var(--at-surface)',
  };

  const btnPrimary: CSSProperties = {
    height: '2.4rem',
    padding: '0 1.5rem',
    fontSize: 'var(--ds-text-sm)',
    fontFamily: 'inherit',
    fontWeight: 600,
    color: 'var(--ds-text-on-primary, oklch(98% 0 0))',
    background: 'var(--at-accent)',
    border: 'none',
    borderRadius: '8px',
    cursor: saving ? 'wait' : 'pointer',
    opacity: saving ? 0.7 : 1,
  };

  const btnCancel: CSSProperties = {
    height: '2.4rem',
    padding: '0 1.25rem',
    fontSize: 'var(--ds-text-sm)',
    fontFamily: 'inherit',
    color: 'var(--at-fg-subtle)',
    background: 'transparent',
    border: '1px solid var(--at-line)',
    borderRadius: '8px',
    cursor: 'pointer',
  };

  const title_style: CSSProperties = {
    fontSize: 'var(--ds-text-base)',
    fontWeight: 700,
    color: 'var(--at-fg)',
  };

  const closeBtn: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    border: '1px solid var(--at-line)',
    borderRadius: '6px',
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--at-fg-subtle)',
  };

  const sectionLabel: CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--at-fg-subtle)',
    margin: '0.5rem 0 -0.25rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid var(--at-line)',
  };

  return createPortal(
    <div
      style={overlay}
      role="dialog"
      aria-modal
      aria-label={initialData ? 'ویرایش صرافی' : 'صرافی جدید'}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={panel}>
        <div style={hdr}>
          <span style={title_style}>
            {initialData ? `ویرایش — ${initialData.name}` : 'صرافی جدید'}
          </span>
          <button type="button" style={closeBtn} onClick={onClose} aria-label="بستن">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div style={body}>
          <p style={sectionLabel}>اطلاعات اصلی</p>

          <FormField label="نام صرافی" required error={errors.name}>
            <input
              ref={firstRef}
              style={{
                ...input,
                borderColor: errors.name ? 'var(--ds-status-error-fg)' : undefined,
              }}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="مثال: صرافی نوری هرات"
              aria-invalid={!!errors.name}
            />
          </FormField>

          {!initialData && (
            <FormField
              label="Slug (یکتا)"
              required
              error={errors.slug}
              hint="مثال: noori-herat — فقط انگلیسی، بدون فاصله"
            >
              <input
                style={{
                  ...input,
                  direction: 'ltr',
                  textAlign: 'left',
                  borderColor: errors.slug ? 'var(--ds-status-error-fg)' : undefined,
                }}
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="exchange-slug"
                aria-invalid={!!errors.slug}
              />
            </FormField>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label="شهر">
              <input
                style={input}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="هرات"
              />
            </FormField>
            <FormField label="شماره مجوز">
              <input
                style={input}
                value={licenseNo}
                onChange={(e) => setLicenseNo(e.target.value)}
                placeholder="AF-2026-XXX"
              />
            </FormField>
          </div>

          <FormField label="آدرس">
            <input
              style={input}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="آدرس کامل"
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label="تلفن">
              <input
                style={{ ...input, direction: 'ltr' }}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+93..."
                type="tel"
              />
            </FormField>
            <FormField label="ایمیل" error={errors.email}>
              <input
                style={{ ...input, direction: 'ltr' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@exchange.af"
                type="email"
                aria-invalid={!!errors.email}
              />
            </FormField>
          </div>

          <p style={sectionLabel}>تنظیمات پلتفرم</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField
              label="کارمزد پلتفرم (٪)"
              error={errors.platformFee}
              hint="درصد از هر تراکنش"
            >
              <input
                style={{
                  ...input,
                  direction: 'ltr',
                  borderColor: errors.platformFee ? 'var(--ds-status-error-fg)' : undefined,
                }}
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
                type="number"
                min="0"
                max="100"
                step="0.01"
                aria-invalid={!!errors.platformFee}
              />
            </FormField>
            <FormField label="سقف روزانه (افغانی)" hint="۰ = بدون محدودیت">
              <input
                style={{ ...input, direction: 'ltr' }}
                value={dailyLimitAf}
                onChange={(e) => setDailyLimitAf(e.target.value)}
                type="number"
                min="0"
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label="وضعیت">
              <select style={select} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="PENDING">در انتظار</option>
                <option value="ACTIVE">فعال</option>
                <option value="SUSPENDED">معلق</option>
                <option value="CLOSED">بسته</option>
              </select>
            </FormField>
            <FormField label="الزام KYC" hint="تأیید هویت اجباری باشد؟">
              <div style={{ display: 'flex', alignItems: 'center', height: '2.4rem', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="requireKyc"
                  checked={requireKyc}
                  onChange={(e) => setRequireKyc(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label
                  htmlFor="requireKyc"
                  style={{
                    fontSize: 'var(--ds-text-sm)',
                    cursor: 'pointer',
                    color: 'var(--at-fg)',
                  }}
                >
                  {requireKyc ? 'بله' : 'خیر'}
                </label>
              </div>
            </FormField>
          </div>
        </div>

        <div style={ftr}>
          <button
            type="button"
            style={btnPrimary}
            onClick={handleSubmit}
            disabled={saving}
            aria-busy={saving}
          >
            {saving ? 'در حال ذخیره…' : initialData ? 'ذخیره تغییرات' : 'ایجاد صرافی'}
          </button>
          <button type="button" style={btnCancel} onClick={onClose}>
            انصراف
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
