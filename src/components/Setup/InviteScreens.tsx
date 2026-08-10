import Link from 'next/link';
import { MailGlyph, ShieldCheckGlyph } from './WizardIcons';

/**
 * Handover screens for the invite-based owner activation flow.
 *
 * Both reuse the `.setup-already` visual language (seal + title + desc +
 * single CTA) so the setup surface stays visually consistent:
 *
 *   - InviteRequired — an OWNER row exists but is still `Pending`: the
 *     account was provisioned by the operator and can only be completed
 *     through the invite link. Rendered by SetupShell when a pending owner
 *     is detected without a (valid) token in the URL.
 *   - InvalidInvite — the `?token=` in the URL is unknown, expired, or
 *     already consumed. Rendered by the /setup routes when resolution fails.
 *
 * These are static server components — no client state.
 */
export function InviteRequired() {
  return (
    <output className="setup-already" aria-live="polite">
      <div className="setup-already__seal" aria-hidden="true">
        <MailGlyph />
      </div>
      <h1 id="setup-heading" className="setup-already__title">
        حساب مالک در انتظار فعال‌سازی است
      </h1>
      <p className="setup-already__desc">
        حساب مالک این سامانه ثبت شده اما هنوز توسط مالک تکمیل نشده است. برای فعال‌سازی، باید از لینک
        دعوت اختصاصی که توسط اپراتور سامانه صادر شده استفاده کنید. اگر لینک ندارید، با پشتیبانی یا
        مالک سامانه تماس بگیرید.
      </p>
      <div className="setup-already__actions">
        <Link href="/auth" className="setup-already__cta">
          رفتن به صفحه‌ی ورود
        </Link>
      </div>
    </output>
  );
}

export function InvalidInvite() {
  return (
    <output className="setup-already" aria-live="polite">
      <div className="setup-already__seal" aria-hidden="true">
        <ShieldCheckGlyph />
      </div>
      <h1 id="setup-heading" className="setup-already__title">
        لینک دعوت نامعتبر یا منقضی است
      </h1>
      <p className="setup-already__desc">
        این لینک دیگر قابل استفاده نیست — ممکن است منقضی شده، قبلاً استفاده شده یا اشتباه وارد شده
        باشد. لطفاً از اپراتور سامانه یک لینک جدید درخواست کنید.
      </p>
      <div className="setup-already__actions">
        <Link href="/auth" className="setup-already__cta">
          رفتن به صفحه‌ی ورود
        </Link>
      </div>
    </output>
  );
}
