'use client';

/**
 * CustomerCreateWorkspace — فرم کامل ایجاد مشتری جدید (صفحه full-page).
 *
 * ۳ بخش: اطلاعات هویتی | تماس و آدرس | KYC و ریسک
 * submit → createCustomerAction → redirect به پروفایل مشتری
 * طرح: ۲ ستون با section cards + side summary
 */

import type { CustomerRow } from '@/actions/exchange-customers';
import { createCustomerAction } from '@/actions/exchange-customers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, ArrowLeft, Loader2, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition } from 'react';
import s from './CustomerCreateWorkspace.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Props {
  exchangeId: string;
  primaryCurrency: string;
}

interface FormState {
  fullName: string;
  phone: string;
  fatherName: string;
  email: string;
  city: string;
  address: string;
  notes: string;
  kycLevel: 'NONE' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
  riskScore: number;
}

const EMPTY: FormState = {
  fullName: '',
  phone: '',
  fatherName: '',
  email: '',
  city: '',
  address: '',
  notes: '',
  kycLevel: 'NONE',
  riskScore: 0,
};

const KYC_LEVELS = [
  { value: 'NONE', label: 'بدون احراز' },
  { value: 'LEVEL_1', label: 'سطح ۱ — هویت پایه' },
  { value: 'LEVEL_2', label: 'سطح ۲ — مدارک رسمی' },
  { value: 'LEVEL_3', label: 'سطح ۳ — تأیید کامل' },
] as const;

// ─── Field Component ─────────────────────────────────────────────────────────

function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.fieldLabel}>
        {label}
        {required && <span className={s.fieldRequired}>*</span>}
      </label>
      {children}
      {error ? (
        <span className={s.fieldError} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className={s.fieldHint}>{hint}</span>
      ) : null}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CustomerCreateWorkspace({ exchangeId, primaryCurrency }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  // validation زنده — خطا همان لحظه که فیلد پر/تغییر می‌شود نمایش داده می‌شود
  const liveErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (touched.fullName && form.fullName.trim() && form.fullName.length < 2) {
      errs.fullName = 'نام کامل حداقل ۲ کاراکتر باشد';
    }
    if (touched.phone && form.phone.trim() && form.phone.replace(/\D/g, '').length < 7) {
      errs.phone = 'شماره تلفن معتبر وارد کنید';
    }
    return errs;
  }, [touched, form.fullName, form.phone]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      setForm((prev) => ({
        ...prev,
        [name]: type === 'number' ? Number(value) : value,
      }));
      setTouched((prev) => ({ ...prev, [name]: true }));
      setError(null);
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setTouched({ fullName: true, phone: true });
      if (liveErrors.fullName || liveErrors.phone) {
        setError(liveErrors.fullName ?? liveErrors.phone);
        return;
      }

      startTransition(async () => {
        setError(null);
        const res = await createCustomerAction(exchangeId, {
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          fatherName: form.fatherName.trim() || null,
          email: form.email.trim() || null,
          city: form.city.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
          kycLevel: form.kycLevel,
          riskScore: form.riskScore,
          status: 'PROSPECT',
        });

        if (!res.success) {
          setError(res.error.message);
          return;
        }

        toast({ title: 'مشتری ایجاد شد', description: `${form.fullName} با موفقیت ثبت شد.` });
        router.push(`/exchange/customers/${(res.data as CustomerRow).id}`);
      });
    },
    [form, exchangeId, router, toast],
  );

  return (
    <form className={s.root} onSubmit={handleSubmit} noValidate>
      {/* ── Left column: form ── */}
      <div className={s.formCol}>
        {/* Section: اطلاعات هویتی */}
        <div className={s.card}>
          <div className={s.cardHead}>
            <span className={s.cardEyebrow}>۰۱</span>
            <h2 className={s.cardTitle}>اطلاعات هویتی</h2>
          </div>
          <div className={s.grid2}>
            <Field
              id="cc-fullName"
              label="نام کامل"
              required
              error={liveErrors.fullName}
            >
              <Input
                id="cc-fullName"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="احمد محمدی"
                autoComplete="name"
                aria-required="true"
                aria-invalid={!!liveErrors.fullName || undefined}
                disabled={isPending}
              />
            </Field>
            <Field id="cc-fatherName" label="نام پدر">
              <Input
                id="cc-fatherName"
                name="fatherName"
                value={form.fatherName}
                onChange={handleChange}
                placeholder="محمد"
                disabled={isPending}
              />
            </Field>
          </div>
        </div>

        {/* Section: تماس */}
        <div className={s.card}>
          <div className={s.cardHead}>
            <span className={s.cardEyebrow}>۰۲</span>
            <h2 className={s.cardTitle}>اطلاعات تماس</h2>
          </div>
          <div className={s.grid2}>
            <Field
              id="cc-phone"
              label="شماره تلفن"
              required
              hint="مثال: +93700000001"
              error={liveErrors.phone}
            >
              <Input
                id="cc-phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+93700000001"
                dir="ltr"
                inputMode="tel"
                aria-required="true"
                aria-invalid={!!liveErrors.phone || undefined}
                disabled={isPending}
              />
            </Field>
            <Field id="cc-email" label="ایمیل">
              <Input
                id="cc-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="ahmad@example.com"
                dir="ltr"
                disabled={isPending}
              />
            </Field>
            <Field id="cc-city" label="شهر">
              <Input
                id="cc-city"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="کابل"
                disabled={isPending}
              />
            </Field>
            <Field id="cc-address" label="آدرس">
              <Input
                id="cc-address"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="خیابان…"
                disabled={isPending}
              />
            </Field>
          </div>
        </div>

        {/* Section: KYC و ریسک */}
        <div className={s.card}>
          <div className={s.cardHead}>
            <span className={s.cardEyebrow}>۰۳</span>
            <h2 className={s.cardTitle}>احراز هویت و ریسک</h2>
          </div>
          <div className={s.grid2}>
            <Field id="cc-kycLevel" label="سطح KYC">
              <select
                id="cc-kycLevel"
                name="kycLevel"
                value={form.kycLevel}
                onChange={handleChange}
                className={s.select}
                disabled={isPending}
              >
                {KYC_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="cc-riskScore" label="امتیاز ریسک" hint="۰ تا ۱۰۰ — پایین‌تر بهتر">
              <Input
                id="cc-riskScore"
                name="riskScore"
                type="number"
                min={0}
                max={100}
                value={form.riskScore}
                onChange={handleChange}
                dir="ltr"
                disabled={isPending}
              />
            </Field>
          </div>
          <Field id="cc-notes" label="یادداشت داخلی">
            <textarea
              id="cc-notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className={s.textarea}
              placeholder="اطلاعات اضافی…"
              disabled={isPending}
            />
          </Field>
        </div>

        {/* Error */}
        {error && (
          <div className={s.errorBanner} role="alert">
            <AlertCircle size={15} aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {/* Footer */}
        <div className={s.footer}>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            انصراف
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 size={15} className={s.spin} aria-hidden />
                در حال ذخیره…
              </>
            ) : (
              <>
                <UserPlus size={15} aria-hidden />
                ایجاد مشتری
                <ArrowLeft size={14} aria-hidden />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Right column: summary ── */}
      <aside className={s.sideCol}>
        <div className={s.sideCard}>
          <h3 className={s.sideTitle}>خلاصه</h3>
          <div className={s.sideRows}>
            <div className={s.sideRow}>
              <span className={s.sideLabel}>نام</span>
              <span className={s.sideVal}>{form.fullName || '—'}</span>
            </div>
            <div className={s.sideRow}>
              <span className={s.sideLabel}>تلفن</span>
              <span className={s.sideVal} dir="ltr">
                {form.phone || '—'}
              </span>
            </div>
            <div className={s.sideRow}>
              <span className={s.sideLabel}>شهر</span>
              <span className={s.sideVal}>{form.city || '—'}</span>
            </div>
            <div className={s.sideRow}>
              <span className={s.sideLabel}>ارز اصلی</span>
              <span className={s.sideVal} dir="ltr">
                {primaryCurrency}
              </span>
            </div>
            <div className={s.sideRow}>
              <span className={s.sideLabel}>KYC</span>
              <span className={s.sideVal}>
                {KYC_LEVELS.find((l) => l.value === form.kycLevel)?.label ?? '—'}
              </span>
            </div>
            <div className={s.sideRow}>
              <span className={s.sideLabel}>امتیاز ریسک</span>
              <span className={s.sideVal}>{form.riskScore}</span>
            </div>
          </div>
        </div>

        <div className={s.sideNotice}>
          <AlertCircle size={13} aria-hidden />
          <span>وضعیت اولیه «احتمالی» تنظیم می‌شود. پس از تأیید هویت به «فعال» تغییر کنید.</span>
        </div>
      </aside>
    </form>
  );
}
