'use client';

/**
 * ServicesOnboarding — Stepper tooltip ۳ مرحله‌ای برای صرافی‌های تازه.
 *
 *  - اولین بار که صرافی وارد `/exchange/services` می‌شود
 *  - flag در localStorage ذخیره می‌شود (`fm-services-onboarding-seen`)
 *  - ۳ مرحله:
 *      1. فعال کن سرویس‌هایت را (toggle روشن)
 *      2. توضیح و لینک CTA اختصاصی بده (متن دلخواه + لینک صفحه خودت)
 *      3. SLA / زمان پاسخ را مشخص کن (مثلا ۱ ساعت)
 *  - Next/Back/Close + progress dots
 *  - localStorage مرز: اگر کاربر همه سرویس‌ها را فعال کرده و توضیح داده، tooltip دیگر نمایش داده نمی‌شود
 *
 *  Position: fixed bottom-left (RTL-safe)
 *  Pattern: Userpilot/Appcues lightweight
 */

import { ArrowLeft, ArrowRight, Check, Clock4, ExternalLink, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import s from './ServicesOnboarding.module.css';

const STORAGE_KEY = 'fm-services-onboarding-seen:v1';

type Step = {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>;
  title: string;
  body: string;
  highlight?: string;
};

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: 'سرویس‌هایت را فعال کن',
    body: 'از بین ۱۰ سرویس، آن‌هایی که آنلاین ارائه می‌دهی را با toggle روشن کن. بقیه غیرفعال می‌ماند.',
    highlight: 'services-step-1',
  },
  {
    icon: ExternalLink,
    title: 'توضیح و لینک اختصاصی',
    body: 'برای هر سرویس فعال، یک توضیح کوتاه فارسی بنویس و اگر صفحه مخصوصی در سایت خودت داری، لینکش را بده. در غیر این صورت مودال درخواست سایت ما باز می‌شود.',
    highlight: 'services-step-2',
  },
  {
    icon: Clock4,
    title: 'SLA / زمان پاسخ',
    body: 'به مشتری نشان بده چقدر سریع جواب می‌دهی. مثلاً «۲ ساعت» یا «۱ روز کاری». خالی بگذار اگر نمی‌توانی تخمین بزنی.',
    highlight: 'services-step-3',
  },
];

type Props = {
  /** اگر همه سرویس‌ها فعال و توضیح داده شده، stepper اصلاً نمایش داده نمی‌شود */
  hasAnyService: boolean;
};

export default function ServicesOnboarding({ hasAnyService }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // mount: اگر قبلاً ندیده و حداقل یک سرویس ندارد، باز کن
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (seen === 'true') return;
    } catch {
      return;
    }
    // فقط اگر صرافی هنوز سرویس فعالی ندارد، نشان بده
    if (!hasAnyService) {
      // ۱ ثانیه تاخیر برای settle شدن UI
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [hasAnyService]);

  const markSeen = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const handleClose = () => {
    setOpen(false);
    markSeen();
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!open) return null;
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* dimmer */}
      <div className={s.backdrop} aria-hidden onClick={handleClose} />

      <div className={s.tooltip} role="dialog" aria-modal="false" aria-labelledby="onb-title">
        <button type="button" className={s.closeBtn} onClick={handleClose} aria-label="بستن">
          <X size={16} strokeWidth={2} />
        </button>

        <div className={s.iconWrap} aria-hidden>
          <Icon size={22} strokeWidth={1.8} />
        </div>

        <div className={s.body}>
          <h3 id="onb-title" className={s.title}>
            {current.title}
          </h3>
          <p className={s.text}>{current.body}</p>
        </div>

        <div className={s.dots} role="presentation">
          {STEPS.map((_, i) => (
            <span key={i} className={`${s.dot} ${i === step ? s.dotActive : ''}`} aria-hidden />
          ))}
        </div>

        <div className={s.actions}>
          {step > 0 ? (
            <button type="button" className={s.btnBack} onClick={handleBack}>
              <ArrowRight size={14} strokeWidth={2} aria-hidden />
              <span>قبلی</span>
            </button>
          ) : (
            <button type="button" className={s.btnBack} onClick={handleClose}>
              <span>بعداً</span>
            </button>
          )}
          <button type="button" className={s.btnNext} onClick={handleNext}>
            <span>{isLast ? 'فهمیدم' : 'بعدی'}</span>
            {isLast ? (
              <Check size={14} strokeWidth={2.2} aria-hidden />
            ) : (
              <ArrowLeft size={14} strokeWidth={2} aria-hidden />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
