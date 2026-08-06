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
import { getTelegramLink, requestPhoneOtpOrTelegramLink } from '@/actions/telegram-otp';
import { AlertCircle, ArrowRight, Phone, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { type FC, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import s from './PhoneVerifyModal.module.css';

interface Props {
  onVerified: (phone: string) => void;
  onClose: () => void;
}

// 'phone'         → ورود شماره
// 'tg-waiting'   → تلگرام باز شد، منتظر Start زدن
// 'otp'          → کد ۶ رقمی
type ModalStep = 'phone' | 'tg-waiting' | 'otp';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX = 20;

const PhoneVerifyModal: FC<Props> = ({ onVerified, onClose }) => {
  const [modalStep, setModalStep] = useState<ModalStep>('phone');
  const [phone, setPhone] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpErr, setOtpErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devCode, _setDevCode] = useState<string | undefined>();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef(0);

  const otpInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const formId = useId();

  // countdown timer برای resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // cleanup polling on unmount
  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    [],
  );

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

  // بعد از وصل شدن تلگرام → بلافاصله OTP بفرست
  const sendOtpAfterLink = useCallback(async () => {
    setLoading(true);
    const res = await requestPhoneOtpOrTelegramLink(phone.trim());
    setLoading(false);
    if (res.kind === 'sent') {
      setCountdown(60);
      setModalStep('otp');
    } else if (res.kind === 'error') {
      setPhoneErr(res.message);
      setModalStep('phone');
    }
    // اگر دوباره need-telegram آمد → تلگرام هنوز وصل نشده، همان صفحه blink می‌کنه
  }, [phone]);

  // polling: هر ۳ ثانیه چک کن تلگرام وصل شد یا نه
  const startPolling = useCallback(() => {
    pollAttemptsRef.current = 0;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      pollAttemptsRef.current += 1;
      if (pollAttemptsRef.current > POLL_MAX) {
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      const res = await getTelegramLink();
      if (res.success && res.data.linked) {
        if (pollRef.current) clearInterval(pollRef.current);
        await sendOtpAfterLink();
      }
    }, POLL_INTERVAL_MS);
  }, [sendOtpAfterLink]);

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
    } else if (res.kind === 'need-telegram') {
      // تلگرام وصل نیست → فوری باز کن + شروع polling
      window.open(res.telegramUrl, '_blank', 'noopener,noreferrer');
      setModalStep('tg-waiting');
      startPolling();
    } else {
      setPhoneErr(res.message);
      if (res.retryAfterMs) setCountdown(Math.ceil(res.retryAfterMs / 1000));
    }
  }, [phone, startPolling]);

  const handleVerify = useCallback(async () => {
    setOtpErr('');
    if (otpCode.trim().length !== 6) {
      setOtpErr('کد باید ۶ رقمی باشد.');
      return;
    }
    setLoading(true);
    const res = await verifyPhoneOtp({ phone: phone.trim(), code: otpCode.trim() });
    setLoading(false);
    if (!res.success) {
      setOtpErr(res.message);
      return;
    }
    onVerified(phone.trim());
  }, [phone, otpCode, onVerified]);

  const handleResend = useCallback(async () => {
    if (countdown > 0 || loading) return;
    setOtpErr('');
    setOtpCode('');
    setLoading(true);
    const res = await requestPhoneOtpOrTelegramLink(phone.trim());
    setLoading(false);
    if (res.kind === 'sent') {
      setCountdown(60);
    } else if (res.kind === 'need-telegram') {
      window.open(res.telegramUrl, '_blank', 'noopener,noreferrer');
      setModalStep('tg-waiting');
      startPolling();
    } else {
      setOtpErr(res.message);
    }
  }, [countdown, loading, phone, startPolling]);

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
              {modalStep === 'tg-waiting' && 'در تلگرام روی Start بزنید…'}
              {modalStep === 'otp' && 'کد ۶ رقمی ارسال‌شده به تلگرام را وارد کنید.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className={s.closeBtn} aria-label="بستن">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className={s.body}>
          {/* ── step: tg-waiting ── */}
          {modalStep === 'tg-waiting' && (
            <div className={s.tgWaiting}>
              <div className={s.tgWaitingIcon} aria-hidden="true">
                {/* Telegram paper-plane SVG */}
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <circle cx="16" cy="16" r="16" fill="oklch(54% 0.22 220)" />
                  <path
                    d="M7 15.5l14-6-4 14-3-5-7-3zm7 2l6-4-6 7v-3z"
                    fill="white"
                    fillRule="evenodd"
                  />
                </svg>
              </div>
              <p className={s.tgWaitingTitle}>تلگرام باز شد</p>
              <p className={s.tgWaitingDesc}>
                روی دکمه <strong>Start</strong> در تلگرام بزنید. بعد از اتصال، کد خودکار ارسال
                می‌شود.
              </p>
              <p className={s.tgWaitingHint}>
                {loading ? 'در حال بررسی اتصال…' : 'منتظر اتصال تلگرام…'}
              </p>
            </div>
          )}

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
                کد تأیید از طریق تلگرام ارسال می‌شود. اگر تلگرام وصل نباشد، با دکمه «دریافت کد»
                تلگرام باز می‌شود.
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
              <input
                id={`${formId}-otp`}
                ref={otpInputRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                dir="ltr"
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value.replace(/\D/g, ''));
                  setOtpErr('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerify();
                }}
                placeholder="_ _ _ _ _ _"
                className={`${s.otpInput} ${otpErr ? s.inputErr : ''}`}
                aria-describedby={otpErr ? `${formId}-otp-err` : undefined}
                autoComplete="one-time-code"
                disabled={loading}
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
          {modalStep === 'tg-waiting' && (
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading}
              className={s.primaryBtn}
            >
              {loading ? (
                <>
                  <span className={s.spinner} aria-hidden="true" />
                  <span>در حال بررسی…</span>
                </>
              ) : (
                <span>باز کردن تلگرام مجدد</span>
              )}
            </button>
          )}
          {modalStep === 'otp' && (
            <button
              type="button"
              onClick={handleVerify}
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
