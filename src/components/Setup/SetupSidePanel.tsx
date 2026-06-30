'use client';

import { toPersianDigits } from '@/lib/setup/format';
import type { SetupFormValues, StepId } from '@/lib/setup/schema';
import { STEPS, stepIndex } from '@/lib/setup/steps';
import * as React from 'react';
import { AdminPreviewCard } from './AdminPreviewCard';

/**
 * SetupSidePanel — desktop side panel that contextualises the wizard.
 *
 * Always shows the live admin preview. On top of that it shows a contextual
 * "tip of the step" + the next step's preview.
 *
 * Hidden below `lg` because the live preview is a Visual Focus device, not a
 * requirement. On smaller screens the preview is shown at the bottom of the
 * wizard instead (see SetupWizard).
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
  const currentIdx = stepIndex(step);
  const tip = STEP_TIPS[step];
  const nextStepDef = STEPS[currentIdx + 1];
  const currentStepDef = STEPS[currentIdx];

  return (
    <aside className="setup-sidepanel" aria-label="پیش‌نمایش و راهنما">
      <div className="setup-sidepanel__step" aria-live="polite">
        <span className="setup-sidepanel__step-eyebrow">اکنون</span>
        <h2 className="setup-sidepanel__step-title">{currentStepDef?.title ?? ''}</h2>
        <p className="setup-sidepanel__step-summary">{currentStepDef?.summary ?? ''}</p>
      </div>

      <AdminPreviewCard values={values} />

      <div className="setup-sidepanel__tip">
        <span className="setup-sidepanel__tip-label">
          <span aria-hidden="true">💡</span>
          <span>نکته</span>
        </span>
        <h3 className="setup-sidepanel__tip-title">{tip.title}</h3>
        <p className="setup-sidepanel__tip-body">{tip.body}</p>
      </div>

      {nextStepDef ? (
        <div className="setup-sidepanel__next" aria-hidden="true">
          <span className="setup-sidepanel__next-label">بعدی</span>
          <div className="setup-sidepanel__next-row">
            <span className="setup-sidepanel__next-num">
              {toPersianDigits(nextStepDef.index + 1)}
            </span>
            <span className="setup-sidepanel__next-title">{nextStepDef.title}</span>
          </div>
          <span className="setup-sidepanel__next-sub">{nextStepDef.summary}</span>
        </div>
      ) : null}
    </aside>
  );
}
