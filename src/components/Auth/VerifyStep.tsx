'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';

import { resendOtp, verifyOtp } from '@/actions/auth-actions';

import OtpDialPad, { type OtpDialPadHandle } from './OtpDialPad';
import {
  type AuthResult,
  type FlowIntent,
  INTENT_LABEL,
  RESEND_COOLDOWN_MS,
  formatCooldown,
} from './flow-shared';

/**
 * 2026-06-24: P2 — own dynamic chunk. Pulls OtpDialPad + the verify
 * server actions on demand. This is the largest step (3 server
 * actions + OTP UI) so lazy-loading it is the biggest perf win.
 */
export default function VerifyStep({
  email,
  intent,
  cooldownMs,
  invalid,
  helpText,
  onResult,
  onCooldownChange,
  onInvalidChange,
  onBack,
}: {
  email: string;
  intent: FlowIntent;
  cooldownMs: number;
  invalid: boolean;
  helpText: string;
  onResult: (result: AuthResult) => void;
  onCooldownChange: (value: number) => void;
  onInvalidChange: (value: boolean) => void;
  onBack: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const otpRef = useRef<OtpDialPadHandle>(null);
  const [otpCode, setOtpCode] = useState('');
  const canSubmitOtp = otpCode.length === 6 && !isPending;

  const submitCode = (code: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('code', code);
      formData.append('intent', intent);
      const result = await verifyOtp(formData);
      onInvalidChange(!result.success);
      if (!result.success) {
        otpRef.current?.focus();
      }
      onResult(result);
    });
  };

  const handleResend = () => {
    if (isPending || cooldownMs > 0) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('intent', intent);
      const result = await resendOtp(formData);
      onInvalidChange(false);
      setOtpCode('');
      onResult(result);
      if (result.success) {
        onCooldownChange(RESEND_COOLDOWN_MS);
      } else if (typeof result.cooldownMs === 'number') {
        onCooldownChange(result.cooldownMs);
      }
    });
  };

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()} className="auth-stage-form">
      <button type="button" className="auth-back" onClick={onBack}>
        <ArrowRight aria-hidden="true" />
        بازگشت
      </button>

      <div className="auth-verify-summary">
        <span className="auth-verify-chip">{INTENT_LABEL[intent]}</span>
        <p className="auth-helper">
          کد برای{' '}
          <span dir="ltr" className="auth-inline-email">
            {email}
          </span>{' '}
          ارسال شده است.
        </p>
      </div>

      <div className="auth-fieldset">
        <label htmlFor="otp-input" className="auth-label">
          کد یک‌بارمصرف
        </label>
        <OtpDialPad
          ref={otpRef}
          onComplete={submitCode}
          onChange={(value) => {
            setOtpCode(value);
            if (invalid) onInvalidChange(false);
          }}
          invalid={invalid}
          disabled={isPending}
          autoSubmit={false}
          describedBy="otp-help"
        />
        <p id="otp-help" className="auth-helper">
          {helpText}
        </p>
      </div>

      <div className="auth-verify-actions">
        <button
          type="button"
          className="auth-cta"
          onClick={() => submitCode(otpCode)}
          disabled={!canSubmitOtp}
          aria-busy={isPending || undefined}
        >
          {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {isPending ? 'در حال تأیید…' : 'تأیید و ادامه'}
        </button>

        <button
          type="button"
          className="auth-cta-secondary"
          onClick={handleResend}
          disabled={isPending || cooldownMs > 0}
          aria-busy={isPending || undefined}
        >
          {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {cooldownMs > 0 ? `ارسال مجدد در ${formatCooldown(cooldownMs)} ثانیه` : 'ارسال دوباره کد'}
        </button>
      </div>
    </form>
  );
}
