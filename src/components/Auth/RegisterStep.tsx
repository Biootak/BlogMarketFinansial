'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useTransition } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { registerUser } from '@/actions/auth-actions';
import { RegisterSchema } from '@/schemas';

import { type AuthResult, LockedEmailChip, PasswordField } from './flow-shared';

export default function RegisterStep({
  initialEmail,
  onResult,
  onBack,
}: {
  initialEmail: string;
  onResult: (result: AuthResult) => void;
  onBack: () => void;
}) {
  type Values = z.infer<typeof RegisterSchema>;
  const form = useForm<Values>({
    resolver: zodResolver(RegisterSchema),
    mode: 'onChange', // validation زنده — خطا همان لحظه که تایپ می‌شود دیده شود
    defaultValues: {
      name: '',
      email: initialEmail,
      password: '',
    },
  });
  const [isPending, startTransition] = useTransition();
  const busy = isPending || form.formState.isSubmitting;

  const onSubmit: SubmitHandler<Values> = (values) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('email', values.email);
      formData.append('password', values.password);
      const result = await registerUser(formData);
      onResult(result);
    });
  };

  const emailLocked = initialEmail.length > 0;

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="auth-stage-form">
      {emailLocked ? (
        /* Locked email chip — when email came from the lookup step */
        <LockedEmailChip email={initialEmail} onChangeEmail={onBack} label="ثبت‌نام برای" />
      ) : (
        /* 2026-08-09: when the user lands on step=register directly (e.g. the
            header «ثبت‌نام» button → /auth?step=register) there is no email in
            the URL, so collect it here — registration becomes a single step:
            email + name + password in one form. */
        <div className="auth-fieldset">
          <label htmlFor="register-email" className="auth-label">
            ایمیل
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            dir="ltr"
            // biome-ignore lint/a11y/noAutofocus: email is the first field when registration starts here
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

      <div className="auth-fieldset">
        <label htmlFor="register-name" className="auth-label">
          نام نمایشی
        </label>
        <input
          id="register-name"
          type="text"
          autoComplete="name"
          // biome-ignore lint/a11y/noAutofocus: name field should auto-focus when email is pre-filled
          autoFocus={emailLocked}
          aria-invalid={Boolean(form.formState.errors.name) || undefined}
          className={`auth-input${form.formState.errors.name ? ' auth-input--invalid' : ''}`}
          {...form.register('name')}
        />
        {form.formState.errors.name?.message ? (
          <span className="auth-error">{form.formState.errors.name.message}</span>
        ) : null}
      </div>

      {/* Hidden email for password-manager autofill (locked path only — the
          visible email field above already serves autofill in the single-step path) */}
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

      <PasswordField<Values>
        name="password"
        id="password"
        label="رمز عبور"
        autoComplete="new-password"
        error={form.formState.errors.password?.message}
        registration={form.register}
        showStrength
      />

      <button type="submit" className="auth-cta" disabled={busy} aria-busy={busy || undefined}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {busy ? 'در حال ساخت حساب…' : 'ایجاد حساب'}
      </button>
    </form>
  );
}
