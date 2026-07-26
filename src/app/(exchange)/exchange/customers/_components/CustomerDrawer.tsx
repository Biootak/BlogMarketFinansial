'use client';

import type { CustomerRow } from '@/actions/exchange-customers';
import { FormField, PanelDrawer } from '@/components/Dashboard/primitives';
import { type CSSProperties, useEffect, useRef, useState } from 'react';

interface Props {
  open: boolean;
  initialData: CustomerRow | null;
  saving: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

const input: CSSProperties = {
  width: '100%',
  height: '2.4rem',
  padding: '0 0.75rem',
  fontSize: 'var(--ds-text-sm)',
  fontFamily: 'inherit',
  color: 'var(--at-fg)',
  background: 'var(--at-canvas-subtle, var(--ds-canvas-subtle))',
  border: '1px solid var(--at-line)',
  borderRadius: '8px',
  outline: 'none',
  transition: 'border-color 120ms ease',
};

const sectionLabel: CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--at-fg-subtle)',
  paddingBottom: '0.5rem',
  borderBottom: '1px solid var(--at-line)',
};

const btnPrimary = (saving: boolean): CSSProperties => ({
  height: '2.4rem',
  padding: '0 1.5rem',
  fontSize: 'var(--ds-text-sm)',
  fontFamily: 'inherit',
  fontWeight: 600,
  color: '#fff',
  background: 'var(--at-accent)',
  border: 'none',
  borderRadius: '8px',
  cursor: saving ? 'wait' : 'pointer',
  opacity: saving ? 0.7 : 1,
});

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

export default function CustomerDrawer({ open, initialData, saving, onClose, onSave }: Props) {
  const [fullName, setFullName] = useState(initialData?.fullName ?? '');
  const [fatherName, setFatherName] = useState(initialData?.fatherName ?? '');
  const [phone, setPhone] = useState(initialData?.phone ?? '');
  const [nationalId, setNationalId] = useState(initialData?.nationalId ?? '');
  const [passportNo, setPassportNo] = useState(initialData?.passportNo ?? '');
  const [email, setEmail] = useState(initialData?.email ?? '');
  const [city, setCity] = useState(initialData?.city ?? '');
  const [address, setAddress] = useState(initialData?.address ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => firstRef.current?.focus(), 60);
  }, [open]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'نام الزامی است';
    if (!phone.trim()) errs.phone = 'شماره تلفن الزامی است';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'ایمیل نامعتبر';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSave({
      fullName: fullName.trim(),
      fatherName: fatherName.trim() || null,
      phone: phone.trim(),
      nationalId: nationalId.trim() || null,
      passportNo: passportNo.trim() || null,
      email: email.trim() || null,
      city: city.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <PanelDrawer
      open={open}
      title={initialData ? 'ویرایش مشتری' : 'مشتری جدید'}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            style={btnPrimary(saving)}
            onClick={handleSubmit}
            disabled={saving}
            aria-busy={saving}
          >
            {saving ? 'در حال ذخیره…' : initialData ? 'ذخیره تغییرات' : 'افزودن مشتری'}
          </button>
          <button type="button" style={btnCancel} onClick={onClose}>
            انصراف
          </button>
        </>
      }
    >
      <p style={sectionLabel}>اطلاعات هویتی</p>
      <FormField label="نام کامل" required error={errors.fullName}>
        <input
          ref={firstRef}
          style={{ ...input, borderColor: errors.fullName ? 'oklch(60% 0.18 25)' : undefined }}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="نام و نام خانوادگی"
          aria-invalid={!!errors.fullName}
        />
      </FormField>
      <FormField label="نام پدر">
        <input
          style={input}
          value={fatherName}
          onChange={(e) => setFatherName(e.target.value)}
          placeholder="نام پدر"
        />
      </FormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <FormField label="کد ملی">
          <input
            style={{ ...input, direction: 'ltr' }}
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            placeholder="کد ملی / NIC"
          />
        </FormField>
        <FormField label="پاسپورت">
          <input
            style={{ ...input, direction: 'ltr' }}
            value={passportNo}
            onChange={(e) => setPassportNo(e.target.value)}
            placeholder="شماره پاسپورت"
          />
        </FormField>
      </div>

      <p style={sectionLabel}>تماس</p>
      <FormField label="شماره تلفن" required error={errors.phone}>
        <input
          style={{
            ...input,
            direction: 'ltr',
            borderColor: errors.phone ? 'oklch(60% 0.18 25)' : undefined,
          }}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+93..."
          type="tel"
          aria-invalid={!!errors.phone}
        />
      </FormField>
      <FormField label="ایمیل" error={errors.email}>
        <input
          style={{
            ...input,
            direction: 'ltr',
            borderColor: errors.email ? 'oklch(60% 0.18 25)' : undefined,
          }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          type="email"
          aria-invalid={!!errors.email}
        />
      </FormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <FormField label="شهر">
          <input
            style={input}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="هرات"
          />
        </FormField>
        <FormField label="آدرس">
          <input
            style={input}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="آدرس"
          />
        </FormField>
      </div>

      <p style={sectionLabel}>یادداشت</p>
      <FormField label="یادداشت داخلی">
        <textarea
          style={
            {
              ...input,
              height: '80px',
              padding: '0.5rem 0.75rem',
              resize: 'vertical',
            } as CSSProperties
          }
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="یادداشت داخلی (قابل مشاهده فقط توسط کارمندان)"
        />
      </FormField>
    </PanelDrawer>
  );
}
