/**
 * resend tags — تست‌های رگرسیون حادثهٔ production 2026-08-22
 *
 * Resend tag name/value را فقط با الگوی ASCII `[a-zA-Z0-9_-]` می‌پذیرد؛
 * قالب‌های ما مقدارهایی مثل «otp:phone-verify» (با کالن) می‌فرستادند و
 * کل ایمیل OTP رد می‌شد. sanitizeResendTag باید همهٔ کاراکترهای خارج از
 * الگو را به خط تیره تبدیل کند تا ارسال هرگز به‌خاطر tag شکست نخورد.
 */

import { describe, expect, it } from 'vitest';
import { __sanitizeResendTagForTests as sanitize } from '@/lib/email/resend';

describe('sanitizeResendTag', () => {
  it('کالن (علت حادثه) → خط تیره', () => {
    expect(sanitize('otp:phone-verify')).toBe('otp-phone-verify');
    expect(sanitize('service-request:status-change')).toBe(
      'service-request-status-change',
    );
  });

  it('حروف غیر-ASCII (فارسی) → خط تیره', () => {
    expect(sanitize('کد:تأیید')).toBe('--------');
  });

  it('کاراکترهای مجاز دست‌نخورده می‌مانند', () => {
    expect(sanitize('Category_1-name')).toBe('Category_1-name');
  });

  it('طول > 64 → برش', () => {
    expect(sanitize('a'.repeat(100)).length).toBe(64);
  });

  it('رشتهٔ خالی/کاملاً نامعتبر → placeholder', () => {
    expect(sanitize('')).toBe('tag');
    expect(sanitize('::')).toBe('--');
  });
});
