import * as React from 'react';
import { LockGlyph, ShieldCheckGlyph } from './WizardIcons';

/**
 * SecurityNotice — small footer card listing the trust signals that apply
 * to the setup page in the current environment.
 *
 * - The IP-gating row is rendered only in production builds (it is
 *   enforced server-side by `createSuperAdmin.ts`).
 * - All copy is Persian and uses semantic <dl> markup so screen readers
 *   pair the labels and values correctly.
 */

export interface SecurityNoticeProps {
  isProduction: boolean;
  /** The user's IP, if the server wants to surface it (optional). */
  clientIp?: string;
}

export function SecurityNotice({ isProduction, clientIp }: SecurityNoticeProps) {
  return (
    <aside className="setup-trust" aria-label="نشان‌های امنیتی">
      <dl className="setup-trust__list">
        <div className="setup-trust__row">
          <dt>
            <LockGlyph className="setup-trust__ico" />
            <span>رمزنگاری</span>
          </dt>
          <dd>bcrypt با ضریب سختی ۱۲ — غیرقابل بازگشت</dd>
        </div>
        <div className="setup-trust__row">
          <dt>
            <ShieldCheckGlyph className="setup-trust__ico" />
            <span>اعتبارسنجی</span>
          </dt>
          <dd>زودهنگام در مرورگر و مجدد در سرور (Zod)</dd>
        </div>
        {isProduction ? (
          <div className="setup-trust__row">
            <dt>
              <ShieldCheckGlyph className="setup-trust__ico" />
              <span>محدودیت IP</span>
            </dt>
            <dd>
              فقط نشانی‌های مجاز در <code>ALLOWED_SETUP_IPS</code>
              {clientIp ? (
                <>
                  {' '}
                  · شناسایی‌شده: <code>{clientIp}</code>
                </>
              ) : null}
            </dd>
          </div>
        ) : null}
      </dl>
    </aside>
  );
}
