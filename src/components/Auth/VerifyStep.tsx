'use client';

import { Loader2 } from 'lucide-react';
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
  const is2FA = intent === '2fa';
  // کد ۶ رقمی اپ Authenticator یا کد پشتیبان ۸ کاراکتری (فقط 2FA)
  const canSubmitOtp = is2FA
    ? (otpCode.length === 6 || otpCode.length === 8) && !isPending
    : otpCode.length === 6 && !isPending;

  // Countdown progress percentage (100% = full cooldown, 0% = ready)
  const cooldownPct = Math.round((cooldownMs / RESEND_COOLDOWN_MS) * 100);
  const cooldownSec = Math.max(0, Math.ceil(cooldownMs / 1000));

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
      {/* Email destination summary — برای 2FA به اپ Authenticator ارجاع می‌دهیم */}
      <div className="auth-verify-summary">
        <span className="auth-verify-chip">{INTENT_LABEL[intent]}</span>
        {is2FA ? (
          <p className="auth-helper">
            کد ۶ رقمی را از اپلیکیشن احراز هویت (Google Authenticator / Authy) یا کد پشتیبان ۸
            کاراکتری وارد کنید برای حساب{' '}
            <span dir="ltr" className="auth-inline-email">
              {email}
            </span>
            .
            <button type="button" className="auth-context-link" onClick={onBack}>
              بازگشت
            </button>
          </p>
        ) : (
          <p className="auth-helper">
            کد به{' '}
            <span dir="ltr" className="auth-inline-email">
              {email}
            </span>{' '}
            ارسال شده است.{' '}
            <button type="button" className="auth-context-link" onClick={onBack}>
              تغییر ایمیل
            </button>
          </p>
        )}
      </div>

      {/* OTP input */}
      <div className="auth-fieldset">
        {/* OtpDialPad generates its own id via useId; label links via htmlFor the otp-label id */}
        <p id="otp-label" className="auth-label" aria-hidden="true">
          کد یک‌بارمصرف
        </p>
        <OtpDialPad
          ref={otpRef}
          onComplete={submitCode}
          onChange={(value) => {
            setOtpCode(value);
            if (invalid) onInvalidChange(false);
          }}
          invalid={invalid}
          disabled={isPending}
          // 2026-08-14: با ۶ رقم کامل (یا ۸ کاراکتر کد پشتیبان) خودکار تأیید
          // شود — دکمه «تأیید و ادامه» همچنان به‌عنوان fallback فعال است.
          autoSubmit
          allowBackupCode={is2FA}
          describedBy="otp-help"
        />
        <p id="otp-help" className="auth-helper">
          {helpText}
        </p>
      </div>

      <div className="auth-verify-actions">
        {/* Primary: confirm */}
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

        {/* Secondary: resend — فقط برای کدهای ایمیل، نه TOTP */}
        {!is2FA && (
          <button
            type="button"
            className="auth-resend-btn"
            onClick={handleResend}
            disabled={isPending || cooldownMs > 0}
            aria-busy={isPending || undefined}
            aria-live="polite"
          >
            {cooldownMs > 0 ? (
              <>
                {/* Countdown arc */}
                <svg className="auth-resend-countdown" viewBox="0 0 24 24" aria-hidden="true">
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    opacity="0.18"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={`${2 * Math.PI * 9}`}
                    strokeDashoffset={`${2 * Math.PI * 9 * (1 - cooldownPct / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 12 12)"
                    style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                  />
                </svg>
                ارسال مجدد در {formatCooldown(cooldownSec * 1000)} ثانیه
              </>
            ) : (
              'ارسال دوباره کد'
            )}
          </button>
        )}
      </div>
    </form>
  );
}
