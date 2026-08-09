'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { loginWithPassword } from '@/actions/auth-actions';
import { LoginSchema } from '@/schemas';

import SocialProviders from './SocialProviders';
import { type AuthResult, LockedEmailChip } from './flow-shared';

export default function LoginStep({
  initialEmail,
  onResult,
  onRecover,
  onBack,
}: {
  initialEmail: string;
  onResult: (result: AuthResult) => void;
  onRecover: () => void;
  onBack: () => void;
}) {
  type Values = z.infer<typeof LoginSchema>;
  const form = useForm<Values>({
    resolver: zodResolver(LoginSchema),
    mode: 'onBlur',
    defaultValues: {
      email: initialEmail,
      password: '',
    },
  });
  const [isPending, startTransition] = useTransition();
  const [visible, setVisible] = useState(false);
  const busy = isPending || form.formState.isSubmitting;

  const emailLocked = initialEmail.length > 0;

  const onSubmit: SubmitHandler<Values> = (values) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', values.email);
      formData.append('password', values.password);
      const result = await loginWithPassword(formData);
      onResult(result);
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="auth-stage-form">
      {emailLocked ? (
        /* Locked email chip — shows which account is being logged in to */
        <LockedEmailChip email={initialEmail} onChangeEmail={onBack} />
      ) : (
        /* 2026-08-09: when the user lands on step=login directly (e.g. the
            header «ورود» button → /auth?step=login) there is no email in the
            URL, so collect it here — login becomes a single step:
            email + password in one form. */
        <div className="auth-fieldset">
          <label htmlFor="login-email" className="auth-label">
            ایمیل
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            dir="ltr"
            // biome-ignore lint/a11y/noAutofocus: email is the first field when login starts here
            autoFocus
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

      <SocialProviders />

      <div className="auth-divider" aria-hidden="true">
        <span className="auth-divider-label">یا ورود با رمز عبور</span>
      </div>

      {/* Hidden email field — kept for password-manager autofill (locked path only) */}
      {emailLocked ? (
        <input
          type="email"
          autoComplete="username email"
          value={initialEmail}
          readOnly
          aria-hidden="true"
          tabIndex={-1}
          style={{ display: 'none' }}
        />
      ) : null}

      <div className="auth-fieldset">
        <div className="auth-label-row">
          <label htmlFor="login-password" className="auth-label">
            رمز عبور
          </label>
          <button type="button" className="auth-link-quiet" onClick={onRecover}>
            فراموشی رمز؟
          </button>
        </div>
        <div className="auth-input-wrap">
          <input
            id="login-password"
            type={visible ? 'text' : 'password'}
            autoComplete="current-password"
            dir="ltr"
            aria-invalid={Boolean(form.formState.errors.password) || undefined}
            className={`auth-input auth-input--with-action${form.formState.errors.password ? ' auth-input--invalid' : ''}`}
            // biome-ignore lint/a11y/noAutofocus: password field should auto-focus since email is pre-filled
            autoFocus={emailLocked}
            {...form.register('password')}
          />
          <button
            type="button"
            className="auth-input-action"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
            aria-pressed={visible}
          >
            {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>
        {form.formState.errors.password?.message ? (
          <span className="auth-error">{form.formState.errors.password.message}</span>
        ) : null}
      </div>

      <button type="submit" className="auth-cta" disabled={busy} aria-busy={busy || undefined}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {busy ? 'در حال ورود…' : 'ورود به حساب'}
      </button>

      {/* Prominent recover path — full-width secondary CTA */}
      <button type="button" className="auth-recover-cta" onClick={onRecover}>
        <KeyRound aria-hidden="true" />
        رمز عبور را فراموش کرده‌ام
      </button>
    </form>
  );
}
