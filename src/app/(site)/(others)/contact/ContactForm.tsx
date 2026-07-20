'use client';

import SocialLinks from '@/components/SocialsList/SocialLinks';
import { AlertCircle, CheckCircle2, Mail, MapPin, Phone, SendHorizonal } from 'lucide-react';
import { useActionState, useEffect, useRef } from 'react';
import { type ContactFormState, sendContactAction } from './contact-action';
import s from './contact.module.css';

const contactInfo = [
  { icon: MapPin, label: 'آدرس', value: 'کابل، افغانستان' },
  { icon: Mail, label: 'ایمیل', value: 'support@financialmarket.com' },
  { icon: Phone, label: 'تلفن', value: '۰۷۰۰ ۰۰۰ ۰۰۰' },
] as const;

const initialState: ContactFormState = { success: false, error: null };

export default function ContactForm() {
  const [state, action, pending] = useActionState(sendContactAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset form on successful submission
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

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
          {contactInfo.map(({ icon: Icon, label, value }) => (
            <div key={label} className={s.infoCard}>
              <div className={s.infoIconWrap} aria-hidden>
                <Icon size={18} strokeWidth={1.75} />
              </div>
              <div>
                <div className={s.infoTitle}>{label}</div>
                <div className={s.infoValue}>{value}</div>
              </div>
            </div>
          ))}

          <div className={s.socialSection}>
            <div className={s.socialTitle}>شبکه‌های اجتماعی</div>
            <SocialLinks />
          </div>
        </aside>

        {/* Form column */}
        <div className={s.formCol}>
          <div className={s.formCard}>
            <h2 className={s.formTitle}>ارسال پیام</h2>

            <form ref={formRef} action={action} noValidate>
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
                  />
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
                  />
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
                  />
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
              <div className={s.successBanner} role="status" aria-live="polite">
                <CheckCircle2 size={18} strokeWidth={1.75} aria-hidden />
                پیام شما با موفقیت ارسال شد. به زودی با شما تماس می‌گیریم.
              </div>
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
