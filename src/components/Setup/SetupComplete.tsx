'use client';

import { toPersianDigits } from '@/lib/setup/format';
import type * as React from 'react';
import { ConfettiBurst } from './ConfettiBurst';
import { ArrowLeftGlyph, CheckGlyph, LockGlyph, ShieldCheckGlyph } from './WizardIcons';

/**
 * Success state — shown after the server action returns `success: true`.
 *
 * Visual treatment:
 *   - Celebratory confetti burst (CSS-only, zero JS timers)
 *   - Conic-gradient seal with concentric rings + check stroke draw
 *   - Clear hierarchy: headline → subhead → "what just happened" → next steps
 *   - Single primary CTA + a low-emphasis secondary link
 *
 * The email is masked for privacy since this screen may be screenshotted
 * during demos. Honours prefers-reduced-motion (confetti hides itself).
 */

export interface SetupCompleteProps {
  email: string;
  onContinue: () => void;
}

const NEXT_STEPS: ReadonlyArray<{
  glyph: React.ReactNode;
  title: string;
  body: string;
}> = [
  {
    glyph: <ShieldCheckGlyph />,
    title: 'امنیت فعال شد',
    body: 'رمز عبور شما با bcrypt(12) هش و در پایگاه داده ذخیره شد.',
  },
  {
    glyph: <LockGlyph />,
    title: 'نشست خودکار غیرفعال',
    body: 'برای ادامه، لازم است با ایمیل و رمز عبور وارد سامانه شوید.',
  },
  {
    glyph: <CheckGlyph />,
    title: 'لاگ رویداد ثبت شد',
    body: 'ایجاد حساب مالک در SystemLog برای پاسخ‌گویی ثبت شد.',
  },
];

export function SetupComplete({ email, onContinue }: SetupCompleteProps) {
  const [localPart] = email.split('@');
  const masked =
    localPart.length <= 2
      ? `${localPart[0] ?? '*'}***@…`
      : `${localPart.slice(0, 2)}${'*'.repeat(Math.max(localPart.length - 2, 1))}@…`;

  return (
    <output className="setup-complete" aria-live="polite">
      <ConfettiBurst count={42} />

      <div className="setup-complete__seal" aria-hidden="true">
        <span className="setup-complete__ring setup-complete__ring--a" />
        <span className="setup-complete__ring setup-complete__ring--b" />
        <span className="setup-complete__ring setup-complete__ring--c" />
        <span className="setup-complete__check">
          <CheckGlyph className="setup-complete__glyph" />
        </span>
      </div>

      <span className="setup-complete__eyebrow">
        <span className="setup-complete__eyebrow-dot" aria-hidden="true" />
        <span>پیکربندی با موفقیت انجام شد</span>
      </span>

      <h2 className="setup-complete__title">حساب مالک آماده است</h2>
      <p className="setup-complete__desc">
        حساب شما با ایمیل <code dir="ltr">{masked}</code> ساخته شد. اکنون می‌توانید وارد سامانه شوید
        و اولین مطلب را منتشر کنید.
      </p>

      <ol className="setup-complete__list">
        {NEXT_STEPS.map((step, idx) => (
          <li
            key={step.title}
            className="setup-complete__item"
            style={{ animationDelay: `${idx * 90}ms` }}
          >
            <span className="setup-complete__item-num" aria-hidden="true">
              {toPersianDigits(idx + 1)}
            </span>
            <span className="setup-complete__item-glyph" aria-hidden="true">
              {step.glyph}
            </span>
            <span className="setup-complete__item-copy">
              <span className="setup-complete__item-title">{step.title}</span>
              <span className="setup-complete__item-body">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="setup-complete__actions">
        <button type="button" onClick={onContinue} className="setup-complete__cta">
          <span>ورود به سامانه</span>
          <ArrowLeftGlyph className="setup-complete__cta-glyph" />
        </button>
        <p className="setup-complete__meta">
          پیشنهاد می‌کنیم بعد از ورود، <strong>احراز هویت دو مرحله‌ای</strong> را فعال کنید.
        </p>
      </div>
    </output>
  );
}
