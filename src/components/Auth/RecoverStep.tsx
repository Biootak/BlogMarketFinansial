'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useTransition } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { recoverPassword } from '@/actions/auth-actions';
import { EmailLookupSchema } from '@/schemas';

import type { AuthResult } from './flow-shared';

/**
 * 2026-06-24: P2 — own dynamic chunk. Smallest step; only pulls
 * react-hook-form + EmailLookupSchema (already used by EmailStep).
 */
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
      <button type="button" className="auth-back" onClick={onBack}>
        <ArrowRight aria-hidden="true" />
        بازگشت به ورود
      </button>

      <div className="auth-fieldset">
        <label htmlFor="recover-email" className="auth-label">
          ایمیل
        </label>
        <input
          id="recover-email"
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
        <span className="auth-helper">
          اگر این ایمیل در سامانه وجود داشته باشد، کد بازیابی ارسال می‌شود.
        </span>
      </div>

      <button type="submit" className="auth-cta" disabled={busy} aria-busy={busy || undefined}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {busy ? 'در حال ارسال…' : 'ارسال کد بازیابی'}
      </button>
    </form>
  );
}
