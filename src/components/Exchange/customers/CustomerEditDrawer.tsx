/**
 * CustomerEditDrawer — Drawer ساخت / ویرایش مشتری (Cockpit).
 *
 * شامل سه بخش: اطلاعات هویتی، تماس، KYC/ریسک.
 * استفاده از PanelDrawer primitive (overlay/portal/focus management).
 */

import {
  type CustomerRow,
  createCustomerAction,
  updateCustomerAction,
} from '@/actions/exchange-customers';
import { FormField, PanelDrawer } from '@/components/Dashboard/primitives';
import { useToast } from '@/components/ui/use-toast';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import s from './CustomerEditDrawer.module.css';

interface Props {
  open: boolean;
  exchangeId: string;
  initialData: CustomerRow | null;
  onClose: () => void;
  onSaved: (customer: CustomerRow) => void;
}

interface FormState {
  fullName: string;
  fatherName: string;
  nationalId: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  notes: string;
  riskScore: number;
  kycLevel: 'NONE' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
  kycStatus: 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
}

const emptyForm: FormState = {
  fullName: '',
  fatherName: '',
  nationalId: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  notes: '',
  riskScore: 0,
  kycLevel: 'NONE',
  kycStatus: 'NOT_STARTED',
};

function fromRow(row: CustomerRow | null): FormState {
  if (!row) return { ...emptyForm };
  return {
    fullName: row.fullName,
    fatherName: row.fatherName ?? '',
    nationalId: '', // هش ذخیره شده — در ویرایش دوباره درخواست می‌شود
    phone: row.phone,
    email: row.email ?? '',
    city: row.city ?? '',
    address: row.address ?? '',
    notes: row.notes ?? '',
    riskScore: row.riskScore,
    kycLevel: row.kycLevel as FormState['kycLevel'],
    kycStatus: row.kycStatus as FormState['kycStatus'],
  };
}

export function CustomerEditDrawer({ open, exchangeId, initialData, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(() => fromRow(initialData));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  // همگام‌سازی با initialData هنگام باز شدن
  useEffect(() => {
    if (!open) return;
    setForm(fromRow(initialData));
    setErrors({});
    const t = window.setTimeout(() => firstRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open, initialData]);

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      errs.fullName = 'نام حداقل ۲ کاراکتر باشد';
    }
    if (!form.phone.trim() || form.phone.trim().length < 7) {
      errs.phone = 'شماره تماس نامعتبر است';
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'ایمیل نامعتبر است';
    }
    if (form.riskScore < 0 || form.riskScore > 100) {
      errs.riskScore = 'امتیاز ریسک باید بین ۰ تا ۱۰۰ باشد';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      fullName: form.fullName.trim(),
      fatherName: form.fatherName.trim() || null,
      nationalId: form.nationalId.trim() || null,
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      city: form.city.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      riskScore: form.riskScore,
      kycLevel: form.kycLevel,
      kycStatus: form.kycStatus,
    };

    const result = initialData
      ? await updateCustomerAction(exchangeId, initialData.id, payload)
      : await createCustomerAction(exchangeId, payload);

    setSaving(false);

    if (result.success) {
      toast({
        title: initialData ? 'مشتری به‌روز شد' : 'مشتری اضافه شد',
        description: result.data.fullName,
      });
      onSaved(result.data);
      onClose();
    } else {
      toast({
        title: 'خطا',
        description: result.error.message,
        variant: 'destructive',
      });
    }
  }, [form, initialData, exchangeId, validate, toast, onSaved, onClose]);

  return (
    <PanelDrawer
      open={open}
      title={initialData ? `ویرایش ${initialData.fullName}` : 'مشتری جدید'}
      onClose={onClose}
      width="min(540px, 100%)"
      footer={
        <div className={s.footer}>
          <button
            type="button"
            className={s.btnPrimary}
            onClick={handleSave}
            disabled={saving}
            aria-busy={saving}
          >
            {saving ? 'در حال ذخیره…' : initialData ? 'ذخیره تغییرات' : 'افزودن مشتری'}
          </button>
          <button type="button" className={s.btnGhost} onClick={onClose} disabled={saving}>
            انصراف
          </button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className={s.form}
      >
        {/* ── Identity ──────────────────────────────────────────────── */}
        <fieldset className={s.section}>
          <legend className={s.legend}>اطلاعات هویتی</legend>
          <FormField label="نام و نام خانوادگی" required error={errors.fullName}>
            <input
              ref={firstRef}
              type="text"
              className={s.input}
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              placeholder="علی احمدی"
              aria-invalid={!!errors.fullName}
              autoComplete="off"
            />
          </FormField>
          <FormField label="نام پدر">
            <input
              type="text"
              className={s.input}
              value={form.fatherName}
              onChange={(e) => update('fatherName', e.target.value)}
              placeholder="نام پدر"
              autoComplete="off"
            />
          </FormField>
          <div className={s.grid2}>
            <FormField
              label={initialData ? 'تذکره / کارت ملی (برای تغییر وارد کنید)' : 'تذکره / کارت ملی'}
              error={errors.nationalId}
            >
              <input
                type="text"
                dir="ltr"
                className={s.input}
                value={form.nationalId}
                onChange={(e) => update('nationalId', e.target.value)}
                placeholder="XXXXXXXXXX"
                autoComplete="off"
                inputMode="numeric"
              />
            </FormField>
            <FormField label="شهر">
              <input
                type="text"
                className={s.input}
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder="کابل"
                autoComplete="off"
              />
            </FormField>
          </div>
        </fieldset>

        {/* ── Contact ──────────────────────────────────────────────── */}
        <fieldset className={s.section}>
          <legend className={s.legend}>تماس</legend>
          <FormField label="شماره تلفن" required error={errors.phone}>
            <input
              type="tel"
              dir="ltr"
              className={s.input}
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="09XXXXXXXXX"
              aria-invalid={!!errors.phone}
              autoComplete="off"
            />
          </FormField>
          <FormField label="ایمیل" error={errors.email}>
            <input
              type="email"
              dir="ltr"
              className={s.input}
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="example@email.com"
              autoComplete="off"
            />
          </FormField>
          <FormField label="آدرس">
            <input
              type="text"
              className={s.input}
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="آدرس کامل"
              autoComplete="off"
            />
          </FormField>
        </fieldset>

        {/* ── KYC + Risk ─────────────────────────────────────────── */}
        <fieldset className={s.section}>
          <legend className={s.legend}>احراز هویت و ریسک</legend>
          <div className={s.grid2}>
            <FormField label="سطح KYC">
              <select
                className={s.select}
                value={form.kycLevel}
                onChange={(e) => update('kycLevel', e.target.value as FormState['kycLevel'])}
              >
                <option value="NONE">بدون احراز</option>
                <option value="LEVEL_1">سطح ۱</option>
                <option value="LEVEL_2">سطح ۲</option>
                <option value="LEVEL_3">سطح ۳</option>
              </select>
            </FormField>
            <FormField label="وضعیت KYC">
              <select
                className={s.select}
                value={form.kycStatus}
                onChange={(e) => update('kycStatus', e.target.value as FormState['kycStatus'])}
              >
                <option value="NOT_STARTED">شروع نشده</option>
                <option value="PENDING">در انتظار</option>
                <option value="APPROVED">تأییدشده</option>
                <option value="REJECTED">ردشده</option>
                <option value="EXPIRED">منقضی</option>
              </select>
            </FormField>
          </div>
          <FormField label="امتیاز ریسک (۰–۱۰۰)" error={errors.riskScore}>
            <div className={s.riskRow}>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                className={s.range}
                value={form.riskScore}
                onChange={(e) => update('riskScore', Number(e.target.value))}
                aria-valuenow={form.riskScore}
                aria-valuemin={0}
                aria-valuemax={100}
                data-tone={form.riskScore > 70 ? 'rose' : form.riskScore > 40 ? 'amber' : 'emerald'}
                style={{ '--pct': `${form.riskScore}%` } as CSSProperties}
              />
              <span
                className={s.riskValue}
                data-tone={form.riskScore > 70 ? 'rose' : form.riskScore > 40 ? 'amber' : 'emerald'}
              >
                {form.riskScore}
              </span>
            </div>
          </FormField>
        </fieldset>

        {/* ── Notes ──────────────────────────────────────────────── */}
        <fieldset className={s.section}>
          <legend className={s.legend}>یادداشت داخلی</legend>
          <FormField label="یادداشت (فقط برای کارمندان قابل مشاهده است)">
            <textarea
              className={s.textarea}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="توضیحات، نکات مهم، محدودیت‌ها…"
              rows={3}
            />
          </FormField>
        </fieldset>
      </form>
    </PanelDrawer>
  );
}

export default CustomerEditDrawer;
