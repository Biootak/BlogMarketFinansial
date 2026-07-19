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
    mode: 'onBlur',
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

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="auth-stage-form">
      {/* Locked email chip */}
      <LockedEmailChip email={initialEmail} onChangeEmail={onBack} label="ثبت‌نام برای" />

      <div className="auth-fieldset">
        <label htmlFor="register-name" className="auth-label">
          نام نمایشی
        </label>
        <input
          id="register-name"
          type="text"
          autoComplete="name"
          // biome-ignore lint/a11y/noAutofocus: name field should auto-focus when email is pre-filled
          autoFocus
          aria-invalid={Boolean(form.formState.errors.name) || undefined}
          className={`auth-input${form.formState.errors.name ? ' auth-input--invalid' : ''}`}
          {...form.register('name')}
        />
        {form.formState.errors.name?.message ? (
          <span className="auth-error">{form.formState.errors.name.message}</span>
        ) : null}
      </div>

      {/* Hidden email for password-manager autofill */}
      <input
        type="email"
        autoComplete="username email"
        value={initialEmail}
        readOnly
        aria-hidden="true"
        tabIndex={-1}
        style={{ display: 'none' }}
      />

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
