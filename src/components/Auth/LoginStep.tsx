'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { loginWithPassword } from '@/actions/auth-actions';
import { LoginSchema } from '@/schemas';

import SocialProviders from './SocialProviders';
import type { AuthResult } from './flow-shared';

/**
 * 2026-06-24: P2 — own dynamic chunk. Keeps the inline Eye/EyeOff
 * toggle here (LoginStep's password field has its own layout —
 * forgot-password link inline — so it doesn't reuse PasswordField).
 */
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
      <button type="button" className="auth-back" onClick={onBack}>
        <ArrowRight aria-hidden="true" />
        بازگشت
      </button>

      <SocialProviders />

      <div className="auth-divider" aria-hidden="true">
        <span className="auth-divider-label">یا ورود با رمز عبور</span>
      </div>

      <div className="auth-fieldset">
        <label htmlFor="login-email" className="auth-label">
          ایمیل
        </label>
        <input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          aria-invalid={Boolean(form.formState.errors.email) || undefined}
          className={`auth-input${form.formState.errors.email ? ' auth-input--invalid' : ''}`}
          {...form.register('email')}
        />
        {form.formState.errors.email?.message ? (
          <span className="auth-error">{form.formState.errors.email.message}</span>
        ) : null}
      </div>

      <div className="auth-fieldset">
        <div className="auth-label-row">
          <label htmlFor="login-password" className="auth-label">
            رمز عبور
          </label>
          <button type="button" className="auth-link-quiet" onClick={onRecover}>
            فراموشی رمز عبور
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
            {...form.register('password')}
          />
          <button
            type="button"
            className="auth-input-action"
            onClick={() => setVisible((current) => !current)}
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
        {busy ? 'در حال ورود…' : 'ورود'}
      </button>
    </form>
  );
}
