'use client';

/**
 * ProfileEditForm — فرم ویرایش فیلدهای پروفایل مشتری.
 *
 * M3/M4-fix (2026-08-01): قبلاً «ویرایش اطلاعات» و لینک‌های settings
 * (?field=email / ?field=phone) به صفحه‌ای بدون فرم ویرایش می‌رفتند — dead end.
 * این فرم updateCustomerProfile (server action واقعی، با Zod validation) را
 * صدا می‌زند و پس از موفقیت، URL را تمیز می‌کند تا فرم بسته شود.
 */

import { updateCustomerProfile } from '@/actions/customer-portal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import s from './ProfileEditForm.module.css';

export type EditableField = 'email' | 'city' | 'address';

interface Props {
  field: EditableField;
  initialValue: string;
  onDone: () => void;
  onSwitch: (field: EditableField) => void;
}

const FIELD_META: Record<EditableField, { label: string; placeholder: string; hint: string }> = {
  email: {
    label: 'ایمیل',
    placeholder: 'example@email.com',
    hint: 'ایمیل برای دریافت تأییدیه‌ها و فاکتورها استفاده می‌شود.',
  },
  city: {
    label: 'شهر',
    placeholder: 'کابل، هرات، مزارشریف …',
    hint: 'شهر محل سکونت شما.',
  },
  address: {
    label: 'آدرس',
    placeholder: 'آدرس کامل …',
    hint: 'آدرس دقیق برای تطبیق هویتی و ارسال مدارک.',
  },
};

export default function ProfileEditForm({ field, initialValue, onDone, onSwitch }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = useState(initialValue);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const meta = FIELD_META[field];
  const isEmail = field === 'email';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side quick validation (server هم با Zod دوباره چک می‌کند)
    if (isEmail && value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      setError('ایمیل معتبر وارد کنید');
      return;
    }
    if (!isEmail && field === 'city' && value.trim().length > 80) {
      setError('شهر حداکثر ۸۰ کاراکتر');
      return;
    }
    if (!isEmail && field === 'address' && value.trim().length > 300) {
      setError('آدرس حداکثر ۳۰۰ کاراکتر');
      return;
    }

    startTransition(async () => {
      const res = await updateCustomerProfile({ [field]: value.trim() || null });
      if (!res.success) {
        setError(res.error ?? 'خطا در ذخیره');
        return;
      }
      toast({ title: 'ذخیره شد', description: `${meta.label} با موفقیت به‌روزرسانی شد.` });
      // URL را از پارامتر field پاک کن تا فرم بسته بماند
      const p = new URLSearchParams(window.location.search);
      p.delete('field');
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${p.toString() ? `?${p}` : ''}`,
      );
      onDone();
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className={s.form} aria-label={`ویرایش ${meta.label}`}>
      <div className={s.formHead}>
        <span className={s.eyebrow}>ویرایش</span>
        <div className={s.tabs} role="tablist" aria-label="انتخاب فیلد">
          {(Object.keys(FIELD_META) as EditableField[]).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={field === f}
              onClick={() => onSwitch(f)}
              className={`${s.tab} ${field === f ? s.tabActive : ''}`}
            >
              {FIELD_META[f].label}
            </button>
          ))}
        </div>
      </div>

      <div className={s.body}>
        <label className={s.label} htmlFor={`edit-${field}`}>
          {meta.label}
        </label>
        {isEmail ? (
          <Input
            id={`edit-${field}`}
            type="email"
            dir="ltr"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={meta.placeholder}
            autoComplete="email"
            aria-invalid={Boolean(error)}
            className={s.input}
          />
        ) : field === 'address' ? (
          <Textarea
            id={`edit-${field}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={meta.placeholder}
            rows={2}
            aria-invalid={Boolean(error)}
            className={s.input}
          />
        ) : (
          <Input
            id={`edit-${field}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={meta.placeholder}
            aria-invalid={Boolean(error)}
            className={s.input}
          />
        )}
        <p className={s.hint}>{meta.hint}</p>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
      </div>

      <div className={s.actions}>
        <Button
          type="submit"
          disabled={pending}
          className={s.save}
          aria-busy={pending || undefined}
        >
          {pending ? (
            <Loader2 size={14} className={s.spinner} aria-hidden />
          ) : (
            <Save size={14} aria-hidden />
          )}
          {pending ? 'در حال ذخیره…' : 'ذخیره'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
          انصراف
        </Button>
      </div>
    </form>
  );
}
