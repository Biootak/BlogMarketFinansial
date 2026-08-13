'use client';

import SocialLinks from '@/components/SocialsList/SocialLinks';
import { AlertCircle, CheckCircle2, Mail, MapPin, Phone, SendHorizonal } from 'lucide-react';
import { useActionState, useEffect, useRef, useState } from 'react';
import { type ContactFormState, sendContactAction } from './contact-action';
import s from './contact.module.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContactFormProps {
  address: string;
  email: string;
  phone: string;
}

const initialState: ContactFormState = { success: false, error: null };

export default function ContactForm({ address, email, phone }: ContactFormProps) {
  const [state, action, pending] = useActionState(sendContactAction, initialState);
  const [values, setValues] = useState({ name: '', email: '', message: '' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const formRef = useRef<HTMLFormElement>(null);

  // validation زنده — خطا همان لحظه که فیلد پر/تغییر می‌شود نمایش داده می‌شود
  const liveErrors = (() => {
    const errs: Record<string, string> = {};
    const { name, email, message } = values;
    if (touched.name && name && name.trim().length < 2) errs.name = 'نام باید حداقل ۲ کاراکتر باشد';
    if (touched.email && email && !EMAIL_RE.test(email.trim())) errs.email = 'ایمیل معتبر وارد کنید';
    if (touched.message && message && message.trim().length < 5) {
      errs.message = 'پیام باید حداقل ۵ کاراکتر باشد';
    }
    return errs;
  })();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const firstError = liveErrors[Object.keys(liveErrors)[0]];
    if (firstError) {
      e.preventDefault();
      return;
    }
  }

  // Reset form on successful submission
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  const contactInfo = [
    { icon: MapPin, label: 'آدرس', value: address },
    { icon: Mail, label: 'ایمیل', value: email, href: `mailto:${email}` },
    ...(phone ? [{ icon: Phone, label: 'تلفن', value: phone, href: `tel:${phone}` }] : []),
  ] as const;

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────── */}
      <header className={s.header}>
        <div className={s.eyebrow}>
          <span className={s.eyebrowDot} aria-hidden />
          تماس با ما
        </div>
        <h1 className={s.title}>
          <span>پیام خود را </span>
          <span className={s.titleAccent}>ارسال کنید</span>
        </h1>
        <p className={s.sub}>کارشناسان ما در کمتر از ۳۰ دقیقه پاسخ خواهند داد.</p>
      </header>

      {/* ── Two-column grid ──────────────────────────────────────── */}
      <div className={s.grid}>
        {/* Info column */}
        <aside className={s.infoCol} aria-label="اطلاعات تماس">
          {contactInfo.map(({ icon: Icon, label, value, ...rest }) => {
            const href = 'href' in rest ? rest.href : undefined;
            return href ? (
              <a key={label} href={href} className={s.infoCard} dir="ltr">
                <div className={s.infoIconWrap} aria-hidden>
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <div>
                  <div className={s.infoTitle}>{label}</div>
                  <div className={s.infoValue}>{value}</div>
                </div>
              </a>
            ) : (
              <div key={label} className={s.infoCard}>
                <div className={s.infoIconWrap} aria-hidden>
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <div>
                  <div className={s.infoTitle}>{label}</div>
                  <div className={s.infoValue}>{value}</div>
                </div>
              </div>
            );
          })}

          <div className={s.socialSection}>
            <div className={s.socialTitle}>شبکه‌های اجتماعی</div>
            <SocialLinks />
          </div>
        </aside>

        {/* Form column */}
        <div className={s.formCol}>
          <div className={s.formCard}>
            <h2 className={s.formTitle}>ارسال پیام</h2>

            <form ref={formRef} action={action} onSubmit={handleSubmit} noValidate>
              <div className={s.fieldset}>
                <div className={s.fieldGroup}>
                  <label htmlFor="cf-name" className={s.label}>
                    نام کامل
                  </label>
                  <input
                    id="cf-name"
                    name="name"
                    type="text"
                    className={s.input}
                    placeholder="علی احمدی"
                    required
                    autoComplete="name"
                    aria-required="true"
                    value={values.name}
                    onChange={(e) => {
                      setValues((v) => ({ ...v, name: e.target.value }));
                      setTouched((t) => ({ ...t, name: true }));
                    }}
                    aria-invalid={!!liveErrors.name || undefined}
                  />
                  {liveErrors.name && (
                    <span className={s.fieldError} role="alert">
                      {liveErrors.name}
                    </span>
                  )}
                </div>

                <div className={s.fieldGroup}>
                  <label htmlFor="cf-email" className={s.label}>
                    آدرس ایمیل
                  </label>
                  <input
                    id="cf-email"
                    name="email"
                    type="email"
                    className={s.input}
                    placeholder="ali@example.com"
                    required
                    autoComplete="email"
                    aria-required="true"
                    dir="ltr"
                    value={values.email}
                    onChange={(e) => {
                      setValues((v) => ({ ...v, email: e.target.value }));
                      setTouched((t) => ({ ...t, email: true }));
                    }}
                    aria-invalid={!!liveErrors.email || undefined}
                  />
                  {liveErrors.email && (
                    <span className={s.fieldError} role="alert">
                      {liveErrors.email}
                    </span>
                  )}
                </div>

                <div className={s.fieldGroup}>
                  <label htmlFor="cf-message" className={s.label}>
                    پیام شما
                  </label>
                  <textarea
                    id="cf-message"
                    name="message"
                    rows={5}
                    className={`${s.input} ${s.textarea}`}
                    placeholder="پیام خود را بنویسید…"
                    required
                    aria-required="true"
                    value={values.message}
                    onChange={(e) => {
                      setValues((v) => ({ ...v, message: e.target.value }));
                      setTouched((t) => ({ ...t, message: true }));
                    }}
                    aria-invalid={!!liveErrors.message || undefined}
                  />
                  {liveErrors.message && (
                    <span className={s.fieldError} role="alert">
                      {liveErrors.message}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  className={s.submitBtn}
                  disabled={pending}
                  aria-busy={pending}
                >
                  <SendHorizonal size={16} strokeWidth={1.75} aria-hidden />
                  {pending ? 'در حال ارسال…' : 'ارسال پیام'}
                </button>
              </div>
            </form>

            {state.success && (
              <output className={s.successBanner} aria-live="polite">
                <CheckCircle2 size={18} strokeWidth={1.75} aria-hidden />
                پیام شما با موفقیت ارسال شد. به زودی با شما تماس می‌گیریم.
              </output>
            )}

            {state.error && (
              <div className={s.errorBanner} role="alert" aria-live="assertive">
                <AlertCircle size={18} strokeWidth={1.75} aria-hidden />
                {state.error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
