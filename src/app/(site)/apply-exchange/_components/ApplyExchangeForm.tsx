'use client';

/**
 * ApplyExchangeForm — فرم درخواست ثبت صرافی
 *
 * R15-fix (2026-07): کاربر لاگین‌شده می‌تواند از اینجا برای ثبت صرافی
 * درخواست بدهد. پس از ثبت موفق، به صفحه تأیید هدایت می‌شود.
 */

import { applyForExchange } from '@/actions/exchanges';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import s from './ApplyExchangeForm.module.css';

interface FormValues {
  name: string;
  slug: string;
  city: string;
  licenseNo: string;
  phone: string;
  email: string;
  address: string;
}

export default function ApplyExchangeForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { name: '', slug: '', city: '', licenseNo: '', phone: '', email: '', address: '' },
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    startTransition(async () => {
      const result = await applyForExchange({
        name: values.name,
        slug: values.slug,
        city: values.city,
        licenseNo: values.licenseNo || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
      });
      if (result.success) {
        router.push('/apply-exchange/success');
      } else {
        if (result.error.code === 'DUPLICATE_SLUG') {
          setError('slug', { message: result.error.message });
        } else {
          setError('root', { message: result.error.message });
        }
      }
    });
  };

  return (
    <div className={s.card}>
      <header className={s.head}>
        <h1 className={s.title}>ثبت‌نام صرافی</h1>
        <p className={s.subtitle}>
          اطلاعات صرافی خود را وارد کنید. پس از بررسی توسط تیم ما فعال می‌شود.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className={s.form} noValidate>
        {/* نام صرافی */}
        <div className={s.field}>
          <label htmlFor="ex-name" className={s.label}>
            نام صرافی <span className={s.req} aria-hidden>*</span>
          </label>
          <input
            id="ex-name"
            type="text"
            className={`${s.input}${errors.name ? ` ${s.inputError}` : ''}`}
            placeholder="صرافی کابل"
            aria-invalid={Boolean(errors.name) || undefined}
            {...register('name', { required: 'نام صرافی الزامی است', minLength: { value: 2, message: 'حداقل ۲ کاراکتر' } })}
          />
          {errors.name ? <span className={s.error}>{errors.name.message}</span> : null}
        </div>

        {/* نام کوتاه (slug) */}
        <div className={s.field}>
          <label htmlFor="ex-slug" className={s.label}>
            نام کوتاه (آدرس) <span className={s.req} aria-hidden>*</span>
          </label>
          <input
            id="ex-slug"
            type="text"
            className={`${s.input}${errors.slug ? ` ${s.inputError}` : ''}`}
            placeholder="kabul-exchange"
            dir="ltr"
            aria-invalid={Boolean(errors.slug) || undefined}
            {...register('slug', {
              required: 'نام کوتاه الزامی است',
              pattern: { value: /^[a-z0-9-]+$/, message: 'فقط حروف انگلیسی کوچک، اعداد و خط تیره' },
              minLength: { value: 2, message: 'حداقل ۲ کاراکتر' },
            })}
          />
          {errors.slug ? <span className={s.error}>{errors.slug.message}</span> : null}
        </div>

        {/* شهر */}
        <div className={s.field}>
          <label htmlFor="ex-city" className={s.label}>
            شهر <span className={s.req} aria-hidden>*</span>
          </label>
          <input
            id="ex-city"
            type="text"
            className={`${s.input}${errors.city ? ` ${s.inputError}` : ''}`}
            placeholder="کابل"
            aria-invalid={Boolean(errors.city) || undefined}
            {...register('city', { required: 'شهر الزامی است' })}
          />
          {errors.city ? <span className={s.error}>{errors.city.message}</span> : null}
        </div>

        {/* شماره مجوز */}
        <div className={s.field}>
          <label htmlFor="ex-license" className={s.label}>شماره مجوز</label>
          <input
            id="ex-license"
            type="text"
            className={s.input}
            placeholder="اختیاری"
            dir="ltr"
            {...register('licenseNo')}
          />
        </div>

        {/* شماره تماس */}
        <div className={s.field}>
          <label htmlFor="ex-phone" className={s.label}>شماره تماس</label>
          <input
            id="ex-phone"
            type="tel"
            className={s.input}
            placeholder="+93 70 000 0000"
            dir="ltr"
            {...register('phone')}
          />
        </div>

        {/* ایمیل */}
        <div className={s.field}>
          <label htmlFor="ex-email" className={s.label}>ایمیل</label>
          <input
            id="ex-email"
            type="email"
            className={s.input}
            placeholder="info@exchange.af"
            dir="ltr"
            {...register('email')}
          />
          {errors.email ? <span className={s.error}>{errors.email.message}</span> : null}
        </div>

        {/* آدرس */}
        <div className={s.field}>
          <label htmlFor="ex-address" className={s.label}>آدرس دقیق</label>
          <textarea
            id="ex-address"
            className={s.textarea}
            rows={3}
            placeholder="آدرس کامل شعبه اصلی"
            {...register('address')}
          />
        </div>

        {/* خطای کلی */}
        {errors.root ? (
          <p className={s.rootError} role="alert">{errors.root.message}</p>
        ) : null}

        <button type="submit" className={s.submit} disabled={isPending} aria-busy={isPending || undefined}>
          {isPending ? <Loader2 size={16} className={s.spinner} aria-hidden /> : null}
          {isPending ? 'در حال ثبت درخواست…' : 'ارسال درخواست ثبت صرافی'}
        </button>
      </form>
    </div>
  );
}
