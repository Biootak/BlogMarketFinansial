'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail } from 'lucide-react';
import { useTransition } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { lookupEmail } from '@/actions/auth-actions';
import { EmailLookupSchema } from '@/schemas';

import SocialProviders from './SocialProviders';
import type { AuthNotice, AuthResult, FlowIntent, InternalStep } from './flow-shared';

/**
 * 2026-06-24: P2 — extracted from AuthFlow.redesign.tsx into its own
 * chunk so the email step's bundle (and that of SocialProviders) only
 * loads on first render. Other steps pull their own dynamic chunks.
 */
export default function EmailStep({
  initialEmail = '',
  onResult,
  onMoveTo,
}: {
  initialEmail?: string;
  onResult: (result: AuthResult) => void;
  onMoveTo: (
    nextStep: InternalStep,
    options?: { email?: string; intent?: FlowIntent; notice?: AuthNotice | null },
  ) => void;
}) {
  type Values = z.infer<typeof EmailLookupSchema>;
  const form = useForm<Values>({
    resolver: zodResolver(EmailLookupSchema),
    mode: 'onChange', // validation زنده — خطا همان لحظه که تایپ می‌شود دیده شود
    // 2026-08-12: when the user comes back from a later step (تغییر ایمیل),
    // pre-fill the email they already entered instead of showing an empty
    // field. The component remounts on each step transition, so defaultValues
    // reflects the latest email.
    defaultValues: { email: initialEmail },
  });
  const [isPending, startTransition] = useTransition();
  const busy = isPending || form.formState.isSubmitting;

  const onSubmit: SubmitHandler<Values> = (values) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', values.email);
      const result = await lookupEmail(formData);
      onResult(result);
    });
  };

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className="auth-stage-form auth-stage-form--compact"
    >
      <SocialProviders />

      <div className="auth-divider" aria-hidden="true">
        <span className="auth-divider-label">یا ادامه با ایمیل</span>
      </div>

      <div className="auth-fieldset">
        <label htmlFor="auth-email" className="auth-label">
          ایمیل
        </label>
        <input
          id="auth-email"
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

      <button type="submit" className="auth-cta" disabled={busy} aria-busy={busy || undefined}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {busy ? 'در حال بررسی…' : 'ادامه'}
      </button>

      <button
        type="button"
        className="auth-link-row"
        onClick={() => onMoveTo('recover', { intent: 'recover', notice: null })}
      >
        <Mail aria-hidden="true" />
        بازیابی رمز عبور
      </button>
    </form>
  );
}
