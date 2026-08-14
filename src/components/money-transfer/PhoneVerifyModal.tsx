'use client';

/**
 * PhoneVerifyModal — inline modal برای تأیید شماره موبایل
 *
 * جریان:
 *   1. کاربر شماره را وارد می‌کند
 *   2. «دریافت کد» → sendPhoneOtp
 *   3. کد ۶ رقمی را وارد می‌کند
 *   4. «تأیید» → verifyPhoneOtp
 *   5. onVerified(phone) فراخوانی می‌شود
 */

import { verifyPhoneOtp } from '@/actions/phone-verify';
import { requestPhoneOtpOrTelegramLink } from '@/actions/telegram-otp';
import CellCodeInput, { type CellCodeInputHandle } from '@/components/ui/CellCodeInput';
import { AlertCircle, ArrowRight, Phone, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { type FC, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import s from './PhoneVerifyModal.module.css';

interface Props {
  onVerified: (phone: string) => void;
  onClose: () => void;
}

// 'phone' → ورود شماره
// 'otp'   → کد ۶ رقمی
type ModalStep = 'phone' | 'otp';

const PhoneVerifyModal: FC<Props> = ({ onVerified, onClose }) => {
  const [modalStep, setModalStep] = useState<ModalStep>('phone');
  const [phone, setPhone] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpErr, setOtpErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devCode, _setDevCode] = useState<string | undefined>();

  const otpInputRef = useRef<CellCodeInputHandle | null>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const formId = useId();

  // countdown timer برای resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // focus اتوماتیک
  useEffect(() => {
    if (modalStep === 'otp') setTimeout(() => otpInputRef.current?.focus(), 60);
    else if (modalStep === 'phone') setTimeout(() => phoneInputRef.current?.focus(), 60);
  }, [modalStep]);

  // بستن با Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSendOtp = useCallback(async () => {
    setPhoneErr('');
    if (!phone.trim()) {
      setPhoneErr('شماره موبایل را وارد کنید.');
      return;
    }
    setLoading(true);
    const res = await requestPhoneOtpOrTelegramLink(phone.trim());
    setLoading(false);
    if (res.kind === 'sent') {
      setCountdown(60);
      setModalStep('otp');
      // تلگرام وصل نیست؟ لینک اتصال اختیاری — کد از بهترین کانال (ایمیل/پیامک) هم رسیده
      if (res.telegramUrl) window.open(res.telegramUrl, '_blank', 'noopener,noreferrer');
    } else {
      setPhoneErr(res.message);
      if (res.retryAfterMs) setCountdown(Math.ceil(res.retryAfterMs / 1000));
    }
  }, [phone]);

  const handleVerify = useCallback(
    async (codeOverride?: string) => {
      setOtpErr('');
      const code = (codeOverride ?? otpCode).trim();
      if (code.length !== 6) {
        setOtpErr('کد باید ۶ رقمی باشد.');
        return;
      }
      setLoading(true);
      const res = await verifyPhoneOtp({ phone: phone.trim(), code });
      setLoading(false);
      if (!res.success) {
        setOtpErr(res.message);
        return;
      }
      onVerified(phone.trim());
    },
    [phone, otpCode, onVerified],
  );

  const handleResend = useCallback(async () => {
    if (countdown > 0 || loading) return;
    setOtpErr('');
    setOtpCode('');
    setLoading(true);
    const res = await requestPhoneOtpOrTelegramLink(phone.trim());
    setLoading(false);
    if (res.kind === 'sent') {
      setCountdown(60);
      if (res.telegramUrl) window.open(res.telegramUrl, '_blank', 'noopener,noreferrer');
    } else {
      setOtpErr(res.message);
    }
  }, [countdown, loading, phone]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    /* backdrop */
    <div
      className={s.backdrop}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && e.target === e.currentTarget) onClose();
      }}
    >
      <dialog open className={s.modal} aria-labelledby={`${formId}-title`}>
        {/* Header */}
        <div className={s.header}>
          <div className={s.iconWrap} aria-hidden="true">
            <Phone size={16} />
          </div>
          <div className={s.headerText}>
            <h3 className={s.title} id={`${formId}-title`}>
              تأیید شماره موبایل
            </h3>
            <p className={s.subtitle}>
              {modalStep === 'phone' && 'شماره موبایل خود را وارد کنید.'}
              {modalStep === 'otp' && 'کد ۶ رقمی ارسال‌شده را وارد کنید.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className={s.closeBtn} aria-label="بستن">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className={s.body}>
          {/* ── step: phone ── */}
          {modalStep === 'phone' && (
            <>
              <label className={s.fieldLabel} htmlFor={`${formId}-phone`}>
                شماره موبایل
              </label>
              <div className={s.phoneRow}>
                <input
                  id={`${formId}-phone`}
                  ref={phoneInputRef}
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setPhoneErr('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendOtp();
                  }}
                  placeholder="+93 7XX XXX XXXX"
                  className={`${s.phoneInput} ${phoneErr ? s.inputErr : ''}`}
                  aria-describedby={phoneErr ? `${formId}-phone-err` : undefined}
                  autoComplete="tel"
                  disabled={loading}
                />
              </div>
              {phoneErr && (
                <p id={`${formId}-phone-err`} className={s.fieldErr} role="alert">
                  <AlertCircle size={12} aria-hidden="true" />
                  {phoneErr}
                </p>
              )}
              <p className={s.hint}>
                کد تأیید از بهترین کانال در دسترس (تلگرام، ایمیل یا پیامک) ارسال می‌شود.
              </p>
            </>
          )}

          {/* ── step: otp ── */}
          {modalStep === 'otp' && (
            <>
              <p className={s.otpDesc}>
                کد ۶ رقمی به <strong dir="ltr">{phone}</strong> ارسال شد.
              </p>

              {/* در dev mode کد نمایش داده می‌شود */}
              {devCode && (
                <div className={s.devCodeBadge} aria-live="polite">
                  <span className={s.devLabel}>DEV</span>
                  <span dir="ltr" className={s.devCode}>
                    {devCode}
                  </span>
                </div>
              )}

              <label className={s.fieldLabel} htmlFor={`${formId}-otp`}>
                کد تأیید
              </label>
              <CellCodeInput
                ref={otpInputRef}
                id={`${formId}-otp`}
                value={otpCode}
                onChange={(v) => {
                  setOtpCode(v);
                  setOtpErr('');
                }}
                onComplete={(code) => void handleVerify(code)}
                disabled={loading}
                invalid={!!otpErr}
                autoComplete="one-time-code"
                ariaLabel="کد تأیید"
                className={s.otpCells}
                cellClassName={s.otpCell}
                filledClassName={s.otpCellFilled}
                invalidClassName={s.otpCellInvalid}
              />
              {otpErr && (
                <p id={`${formId}-otp-err`} className={s.fieldErr} role="alert">
                  <AlertCircle size={12} aria-hidden="true" />
                  {otpErr}
                </p>
              )}

              <div className={s.resendRow}>
                {countdown > 0 ? (
                  <span className={s.countdownText} aria-live="polite">
                    ارسال مجدد در{' '}
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{countdown}</span> ثانیه
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className={s.resendBtn}
                  >
                    <RotateCcw size={11} aria-hidden="true" />
                    ارسال مجدد
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setModalStep('phone');
                    setOtpCode('');
                    setOtpErr('');
                  }}
                  className={s.changePhoneBtn}
                >
                  <ArrowRight size={11} aria-hidden="true" />
                  تغییر شماره
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={s.footer}>
          {modalStep === 'phone' && (
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading || !phone.trim()}
              className={s.primaryBtn}
            >
              {loading ? (
                <>
                  <span className={s.spinner} aria-hidden="true" />
                  <span>در حال ارسال…</span>
                </>
              ) : (
                <>
                  <Phone size={14} aria-hidden="true" />
                  <span>دریافت کد تأیید</span>
                </>
              )}
            </button>
          )}
          {modalStep === 'otp' && (
            <button
              type="button"
              onClick={() => void handleVerify()}
              disabled={loading || otpCode.length !== 6}
              className={s.primaryBtn}
            >
              {loading ? (
                <>
                  <span className={s.spinner} aria-hidden="true" />
                  <span>در حال تأیید…</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} aria-hidden="true" />
                  <span>تأیید شماره</span>
                </>
              )}
            </button>
          )}
          <button type="button" onClick={onClose} className={s.cancelBtn}>
            انصراف
          </button>
        </div>
      </dialog>
    </div>,
    document.body,
  );
};

export default PhoneVerifyModal;
