'use client';

/**
 * ExchangeServiceRequestDialog — مودال درخواست سرویس از یک صرافی خاص.
 *
 *  از createServiceRequest موجود استفاده می‌کند و targetExchangeId را پاس می‌دهد.
 *  ساده‌تر از ServiceRequestForm چند مرحله‌ای — کاربر قبلاً سرویس و صرافی را انتخاب کرده.
 *
 *  UX:
 *   - Header: نام سرویس + نام صرافی
 *   - Body: نام + تلفن + روش تماس + توضیح کوتاه
 *   - Submit → ۴ حالت: idle / submitting / success (tracking code) / error
 *   - ESC + click outside برای بستن
 *   - focus trap ساده (اولین input)
 */

import type { PublicExchangeService } from '@/actions/exchange-services';
import { createServiceRequest } from '@/actions/serviceRequestActions';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getServiceMeta } from '@/lib/exchange-services';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Loader2,
  MessageCircle,
  Phone,
  Send,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import s from './ExchangeServiceRequestDialog.module.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exchange: {
    id: string;
    slug: string;
    name: string;
    displayName: string | null;
  };
  service: PublicExchangeService;
};

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

export default function ExchangeServiceRequestDialog({
  open,
  onOpenChange,
  exchange,
  service,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactMethod, setContactMethod] = useState<'telegram' | 'whatsapp'>('telegram');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [interacted, setInteracted] = useState(false);

  // validation زنده — خطا همان لحظه که فیلد پر/تغییر می‌شود نمایش داده می‌شود
  const fieldErrors = useMemo(() => {
    if (!interacted) return {} as Record<string, string>;
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = 'نام و نام خانوادگی را وارد کنید';
    if (phone.replace(/\D/g, '').length < 10) errs.phone = 'شماره تماس معتبر نیست';
    return errs;
  }, [interacted, name, phone]);

  const meta = getServiceMeta(service.serviceKey);
  const exchangeTitle = exchange.displayName ?? exchange.name;

  // Reset on open change
  useEffect(() => {
    if (open) {
      setStatus('idle');
      setErrorMsg(null);
      setTrackingCode(null);
      setName('');
      setPhone('');
      setDescription('');
      setCopied(false);
      // focus first input بعد از paint
      requestAnimationFrame(() => firstInputRef.current?.focus());
    }
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // ESC key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status !== 'submitting') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, status, onOpenChange]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;
    setInteracted(true);

    // basic validation (با پیام‌های یکسان سمت UI — برای اطمینان دوباره چک می‌شود)
    if (fieldErrors.name || fieldErrors.phone) {
      setErrorMsg(fieldErrors.name ?? fieldErrors.phone ?? '');
      return;
    }

    setStatus('submitting');
    setErrorMsg(null);

    const result = await createServiceRequest({
      serviceType: service.serviceKey,
      amount: '1', // مبلغ بعداً در مکالمه با صرافی مشخص می‌شود
      currency: 'USD',
      fullName: name.trim(),
      phone: phone.trim(),
      contactMethod,
      description: description.trim() || null,
      targetExchangeId: exchange.id,
    });

    if (result.success) {
      setTrackingCode(result.data.trackingCode);
      setStatus('success');
    } else {
      setStatus('error');
      setErrorMsg(result.error.message);
    }
  };

  const handleCopy = async () => {
    if (!trackingCode) return;
    try {
      await navigator.clipboard.writeText(trackingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  if (!open) return null;

  return (
    <div
      className={s.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget && status !== 'submitting') onOpenChange(false);
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={s.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="esrd-title"
        dir="rtl"
      >
        <header className={s.header}>
          <div className={s.headerText}>
            {meta && (
              <span className={s.eyebrow}>
                <meta.icon size={12} strokeWidth={1.9} aria-hidden />
                <span>{service.name}</span>
              </span>
            )}
            <h2 id="esrd-title" className={s.title}>
              درخواست از {exchangeTitle}
            </h2>
            <p className={s.sub}>{service.description}</p>
          </div>
          <button
            type="button"
            className={s.closeBtn}
            onClick={() => status !== 'submitting' && onOpenChange(false)}
            aria-label="بستن"
            disabled={status === 'submitting'}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        {status === 'success' && trackingCode ? (
          <SuccessPanel
            trackingCode={trackingCode}
            exchangeName={exchangeTitle}
            onCopy={handleCopy}
            copied={copied}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <form onSubmit={onSubmit} className={s.form} noValidate>
            <div className={s.field}>
              <label htmlFor="esrd-name" className={s.label}>
                <UserIcon size={14} strokeWidth={1.8} aria-hidden />
                <span>نام و نام خانوادگی</span>
              </label>
              <input
                ref={firstInputRef}
                id="esrd-name"
                type="text"
                className={s.input}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setInteracted(true);
                }}
                placeholder="مثلاً علی محمدی"
                autoComplete="name"
                maxLength={80}
                disabled={status === 'submitting'}
                aria-invalid={!!fieldErrors.name || undefined}
              />
              {fieldErrors.name && (
                <span className={s.fieldError} role="alert">
                  {fieldErrors.name}
                </span>
              )}
            </div>

            <div className={s.field}>
              <label htmlFor="esrd-phone" className={s.label}>
                <Phone size={14} strokeWidth={1.8} aria-hidden />
                <span>شماره تماس</span>
              </label>
              <input
                id="esrd-phone"
                type="tel"
                inputMode="tel"
                className={s.input}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setInteracted(true);
                }}
                placeholder="مثلاً ۰۹۱۲۳۴۵۶۷۸۹"
                autoComplete="tel"
                maxLength={20}
                disabled={status === 'submitting'}
                aria-invalid={!!fieldErrors.phone || undefined}
              />
              {fieldErrors.phone && (
                <span className={s.fieldError} role="alert">
                  {fieldErrors.phone}
                </span>
              )}
            </div>

            <fieldset className={s.field} disabled={status === 'submitting'}>
              <legend className={s.label}>
                <MessageCircle size={14} strokeWidth={1.8} aria-hidden />
                <span>روش تماس</span>
              </legend>
              <RadioGroup
                value={contactMethod}
                onValueChange={(v) => setContactMethod(v as 'telegram' | 'whatsapp')}
                className={s.radioRow}
              >
                <label className={s.radioOption} onClick={() => setContactMethod('telegram')}>
                  <RadioGroupItem value="telegram" id="esrd-contact-telegram" />
                  <span>تلگرام</span>
                </label>
                <label className={s.radioOption} onClick={() => setContactMethod('whatsapp')}>
                  <RadioGroupItem value="whatsapp" id="esrd-contact-whatsapp" />
                  <span>واتساپ</span>
                </label>
              </RadioGroup>
            </fieldset>

            <div className={s.field}>
              <label htmlFor="esrd-desc" className={s.label}>
                <span>توضیحات (اختیاری)</span>
              </label>
              <textarea
                id="esrd-desc"
                className={s.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="مثلاً مبلغ تقریبی، کشور مقصد، یا توضیح کوتاه درباره نیاز شما"
                maxLength={400}
                rows={3}
                disabled={status === 'submitting'}
              />
              <span className={s.counter}>{description.length}/400</span>
            </div>

            {errorMsg && status === 'error' && (
              <div className={s.errorBox} role="alert">
                <AlertCircle size={16} strokeWidth={2} aria-hidden />
                <span>{errorMsg}</span>
              </div>
            )}

            <button type="submit" className={s.submitBtn} disabled={status === 'submitting'}>
              {status === 'submitting' ? (
                <>
                  <Loader2 size={16} strokeWidth={2} className={s.spin} aria-hidden />
                  <span>در حال ارسال...</span>
                </>
              ) : (
                <>
                  <Send size={16} strokeWidth={2} aria-hidden />
                  <span>ثبت درخواست</span>
                </>
              )}
            </button>

            <p className={s.fineprint}>
              با ثبت درخواست، {exchangeTitle} از طریق روش تماس انتخابی پاسخ می‌دهد. کد پیگیری برای
              شما نمایش داده می‌شود.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Success Panel ─────────────────────────────────────────── */

function SuccessPanel({
  trackingCode,
  exchangeName,
  onCopy,
  copied,
  onClose,
}: {
  trackingCode: string;
  exchangeName: string;
  onCopy: () => void;
  copied: boolean;
  onClose: () => void;
}) {
  return (
    <div className={s.successPanel}>
      <div className={s.successIcon} aria-hidden>
        <CheckCircle2 size={32} strokeWidth={1.8} />
      </div>
      <h3 className={s.successTitle}>درخواست شما ثبت شد</h3>
      <p className={s.successText}>
        {exchangeName} به زودی با شما تماس می‌گیرد. کد پیگیری زیر را نزد خود نگه دارید.
      </p>

      <div className={s.trackingBox}>
        <span className={s.trackingLabel}>کد پیگیری</span>
        <div className={s.trackingRow}>
          <code className={s.trackingCode}>{trackingCode}</code>
          <button type="button" className={s.copyBtn} onClick={onCopy} aria-label="کپی کد">
            {copied ? (
              <CheckCircle2 size={14} strokeWidth={2} />
            ) : (
              <Copy size={14} strokeWidth={2} />
            )}
            <span>{copied ? 'کپی شد' : 'کپی'}</span>
          </button>
        </div>
      </div>

      <button type="button" className={s.submitBtn} onClick={onClose}>
        متوجه شدم
      </button>
    </div>
  );
}
