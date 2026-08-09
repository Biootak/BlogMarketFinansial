'use client';

import type { SetupFormValues, StepId } from '@/lib/setup/schema';
import { AdminPreviewCard } from './AdminPreviewCard';
import { SparklesGlyph } from './WizardIcons';

/**
 * SetupSidePanel — desktop side panel that contextualises the wizard.
 *
 * Two quiet blocks only: the live admin preview (the Visual Focus) and a
 * per-step tip. The "اکنون / بعدی" step cards are deliberately omitted —
 * the stepper already owns progress, so the panel stays uncluttered.
 *
 * Hidden below `lg` (see setup.css `.setup-shell__aside`) because the live
 * preview is a Visual Focus device, not a requirement. On smaller screens
 * the stepper + step header already carry the context, so the panel is
 * dropped entirely to keep the form the single focus.
 */

export interface SetupSidePanelProps {
  values: Pick<SetupFormValues, 'name' | 'email' | 'jobName' | 'company' | 'bio' | 'phoneNumber'>;
  step: StepId;
}

interface StepTip {
  title: string;
  body: string;
}

const STEP_TIPS: Record<StepId, StepTip> = {
  intro: {
    title: 'پیش از شروع',
    body: 'این پیکربندی فقط یک‌بار انجام می‌شود. مطمئن شوید زمان کافی برای تکمیل چهار مرحله دارید.',
  },
  identity: {
    title: 'نام و ایمیل',
    body: 'ایمیل باید معتبر باشد چون لینک بازیابی رمز عبور و اعلان‌های امنیتی به آن ارسال می‌شود.',
  },
  credentials: {
    title: 'رمز قوی بسازید',
    body: 'از یک عبارت ۱۲ کاراکتری شامل حروف بزرگ، کوچک، عدد و کاراکتر خاص استفاده کنید. یک مدیر رمز می‌تواند کمک‌تان کند.',
  },
  profile: {
    title: 'پروفایل عمومی',
    body: 'این اطلاعات در گزارش‌های برند، ایمیل‌های رسمی و صفحه‌ی تیم نمایش داده می‌شود.',
  },
  review: {
    title: 'تأیید نهایی',
    body: 'یک‌بار همه‌چیز را مرور کنید. پس از ساخت حساب، تغییر ایمیل به تأیید دو مرحله‌ای نیاز دارد.',
  },
};

export function SetupSidePanel({ values, step }: SetupSidePanelProps) {
  const tip = STEP_TIPS[step];

  return (
    <aside className="setup-sidepanel" aria-label="پیش‌نمایش و راهنما">
      <AdminPreviewCard values={values} />

      <div className="setup-sidepanel__tip">
        <span className="setup-sidepanel__tip-label">
          <SparklesGlyph className="setup-sidepanel__tip-glyph" />
          <span>نکته</span>
        </span>
        <h3 className="setup-sidepanel__tip-title">{tip.title}</h3>
        <p className="setup-sidepanel__tip-body">{tip.body}</p>
      </div>
    </aside>
  );
}
