'use client';

import * as React from 'react';
import { CheckGlyph, ShieldCheckGlyph } from './WizardIcons';

export interface SetupCompleteProps {
  email: string;
  onContinue: () => void;
}

/**
 * Success state — shown after the server action returns `success: true`.
 *
 * Subtle celebratory motion (single check stroke draw) gated by the global
 * prefers-reduced-motion guard. The email is masked for privacy since this
 * screen may be screenshotted during demos.
 */
export function SetupComplete({ email, onContinue }: SetupCompleteProps) {
  const [localPart] = email.split('@');
  const masked =
    localPart.length <= 2
      ? `${localPart[0] ?? '*'}***@…`
      : `${localPart.slice(0, 2)}${'*'.repeat(Math.max(localPart.length - 2, 1))}@…`;

  return (
    <output className="setup-complete" aria-live="polite">
      <div className="setup-complete__seal" aria-hidden="true">
        <span className="setup-complete__ring" />
        <span className="setup-complete__ring setup-complete__ring--inner" />
        <span className="setup-complete__check">
          <CheckGlyph className="setup-complete__glyph" />
        </span>
      </div>

      <h2 className="setup-complete__title">حساب مدیر اصلی ایجاد شد</h2>
      <p className="setup-complete__desc">
        پیکربندی اولیه با موفقیت به پایان رسید. حساب شما با ایمیل <code dir="ltr">{masked}</code>{' '}
        ایجاد شد و اکنون می‌توانید وارد شوید.
      </p>

      <ul className="setup-complete__list">
        <li>
          <ShieldCheckGlyph className="setup-complete__ico" />
          <span>رمز عبور شما با bcrypt(12) ایمن ذخیره شد</span>
        </li>
        <li>
          <ShieldCheckGlyph className="setup-complete__ico" />
          <span>لاگ رویداد در SystemLog ثبت شد</span>
        </li>
        <li>
          <ShieldCheckGlyph className="setup-complete__ico" />
          <span>نشست خودکار فعال نیست — برای ادامه وارد شوید</span>
        </li>
      </ul>

      <button type="button" onClick={onContinue} className="setup-complete__cta">
        ورود به سامانه
      </button>
    </output>
  );
}
