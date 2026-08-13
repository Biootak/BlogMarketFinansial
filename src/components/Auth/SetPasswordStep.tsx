'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { setNewPassword } from '@/actions/auth-actions';
import { SetPasswordSchema } from '@/schemas';

import { type AuthResult, scorePassword } from './flow-shared';

/**
 * 2026-06-24: P2 — own dynamic chunk + P0-1 reset-token gate.
 *
 * If the parent didn't capture a reset token (e.g. the user hard-
 * refreshed on this step), we surface a generic error instead of
 * silently 403'ing on submit. The action will reject anyway — this
 * just makes the failure visible.
 */
export default function SetPasswordStep({
  email,
  resetToken,
  onResult,
  onBack,
}: {
  email: string;
  resetToken: string | null;
  onResult: (result: AuthResult) => void;
  onBack: () => void;
}) {
  type Values = z.infer<typeof SetPasswordSchema>;
  const form = useForm<Values>({
    resolver: zodResolver(SetPasswordSchema),
    mode: 'onChange', // validation زنده — خطا همان لحظه که تایپ می‌شود دیده شود
    defaultValues: {
      email,
      resetToken: resetToken ?? '',
      password: '',
    },
  });
  const [isPending, startTransition] = useTransition();
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState('');
  const strength = useMemo(() => scorePassword(value), [value]);
  const busy = isPending || form.formState.isSubmitting;

  const onSubmit: SubmitHandler<Values> = (values) => {
    if (!resetToken) {
      onResult({
        success: false,
        error: 'نشست بازنشانی منقضی شده است. لطفاً دوباره درخواست کد کنید',
      });
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', values.email);
      formData.append('password', values.password);
      formData.append('resetToken', resetToken);
      const result = await setNewPassword(formData);
      onResult(result);
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="auth-stage-form">
      <button type="button" className="auth-back" onClick={onBack}>
        <ArrowRight aria-hidden="true" />
        بازگشت
      </button>

      <input type="hidden" {...form.register('email')} />
      <input type="hidden" {...form.register('resetToken')} />

      <div className="auth-fieldset">
        <label htmlFor="set-password" className="auth-label">
          رمز عبور جدید
        </label>
        <div className="auth-input-wrap">
          <input
            id="set-password"
            type={visible ? 'text' : 'password'}
            autoComplete="new-password"
            dir="ltr"
            aria-invalid={Boolean(form.formState.errors.password) || undefined}
            className={`auth-input auth-input--with-action${form.formState.errors.password ? ' auth-input--invalid' : ''}`}
            {...form.register('password', {
              onChange: (event) => {
                setValue(event.target.value);
              },
            })}
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
        {value ? (
          <div className="auth-strength" aria-live="polite">
            <div className="auth-strength-track" aria-hidden="true">
              {[1, 2, 3, 4].map((segment) => (
                <span
                  key={segment}
                  className={
                    strength.score >= segment
                      ? `auth-strength-seg auth-strength-seg--on-${strength.score}`
                      : 'auth-strength-seg'
                  }
                />
              ))}
            </div>
            <span className="auth-strength-label">قدرت رمز: {strength.label}</span>
          </div>
        ) : null}
      </div>

      <button type="submit" className="auth-cta" disabled={busy} aria-busy={busy || undefined}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {busy ? 'در حال ثبت…' : 'ثبت رمز جدید'}
      </button>
    </form>
  );
}
