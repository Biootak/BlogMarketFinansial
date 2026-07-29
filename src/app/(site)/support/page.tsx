import { getSiteIdentity } from '@/lib/site-identity';
import type { Metadata } from 'next';
import { HelpCenterContent } from '@/app/(site)/help-center/HelpCenterContent';
import s from '@/app/(site)/help-center/help-center.module.css';

/**
 * /support — Public support landing page.
 *
 * 2026-07-29: Replaced redirect with a real, self-contained page so
 * users (especially authenticated ones on mobile who hit this from
 * the bottom-nav) see something instead of a 0-second flash.
 *
 * Reuses the existing HelpCenterContent (same widget, same categories)
 * because the help-center is the canonical "support" surface; the
 * dedicated /help-center URL still exists for direct linking.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  return {
    title: `پشتیبانی | ${siteName}`,
    description: `پشتیبانی ۲۴/۷ ${siteName} — راهنمای کامل، پرسش‌های متداول و راه‌های ارتباطی.`,
    alternates: { canonical: '/support' },
  };
}

export default function SupportPage() {
  return (
    <div className={s.page}>
      <div className="container">
        <HelpCenterContent />
      </div>
    </div>
  );
}
