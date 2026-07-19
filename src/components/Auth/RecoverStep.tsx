'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, MailCheck } from 'lucide-react';
import { useTransition } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { recoverPassword } from '@/actions/auth-actions';
import { EmailLookupSchema } from '@/schemas';

import { type AuthResult, LockedEmailChip } from './flow-shared';

export default function RecoverStep({
  initialEmail,
  onResult,
  onBack,
}: {
  initialEmail: string;
  onResult: (result: AuthResult) => void;
  onBack: () => void;
}) {
  type Values = z.infer<typeof EmailLookupSchema>;

  // When coming from LoginStep, email is already known — skip the field.
  const hasEmail = Boolean(initialEmail);

  const form = useForm<Values>({
    resolver: zodResolver(EmailLookupSchema),
    mode: 'onBlur',
    defaultValues: { email: initialEmail },
  });
  const [isPending, startTransition] = useTransition();
  const busy = isPending || form.formState.isSubmitting;

  const onSubmit: SubmitHandler<Values> = (values) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', values.email);
      const result = await recoverPassword(formData);
      onResult(result);
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="auth-stage-form">
      {hasEmail ? (
        /* Email is known — show locked chip + change option */
        <LockedEmailChip email={initialEmail} onChangeEmail={onBack} label="ارسال کد به" />
      ) : (
        /* No email context — show editable input */
        <div className="auth-fieldset">
          <label htmlFor="recover-email" className="auth-label">
            ایمیل حساب
          </label>
          <input
            id="recover-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            placeholder="you@example.com"
            aria-invalid={Boolean(form.formState.errors.email) || undefined}
            className={`auth-input${form.formState.errors.email ? ' auth-input--invalid' : ''}`}
            {...form.register('email')}
          />
          {form.formState.errors.email?.message ? (
            <span className="auth-error">{form.formState.errors.email.message}</span>
          ) : null}
        </div>
      )}

      {/* Privacy-preserving info note */}
      <div className="auth-info-note">
        <MailCheck aria-hidden="true" />
        <p>
          اگر این ایمیل در سامانه ثبت‌شده باشد، یک کد ۶ رقمی برایتان می‌فرستیم. اگر ایمیلی دریافت
          نکردید، پوشه spam را بررسی کنید.
        </p>
      </div>

      <button type="submit" className="auth-cta" disabled={busy} aria-busy={busy || undefined}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {busy ? 'در حال ارسال…' : 'ارسال کد بازیابی'}
      </button>

      <button type="button" className="auth-back" onClick={onBack}>
        بازگشت به ورود
      </button>
    </form>
  );
}
