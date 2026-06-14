/**
 * HeaderAdBar — نوار باریک تبلیغ بالای هدر
 *
 *  - Server component که تبلیغ فعال را از cache می‌خواند
 *  - در صورت نبودن تبلیغ فعال، چیزی رندر نمی‌شود
 *  - دکمه × با client component برای بستن (cookie ۲۴ ساعته)
 *  - بدون framer-motion در shell
 *
 *  ۲۰۲۶-۰۶-۱۴: سازگار با الگوی Header.tsx (Suspense + TickerBar)
 */

import { getActiveHeaderAd } from '@/actions/headerAdActions';
import HeaderAdBarClient from './HeaderAdBarClient';

export default async function HeaderAdBar() {
  const result = await getActiveHeaderAd();
  if (!result.success || !result.data) return null;

  const ad = result.data as {
    id: string;
    text: string;
    subtext?: string | null;
    ctaLabel?: string | null;
    ctaHref?: string | null;
    imageUrl?: string | null;
    href?: string | null;
    variant: 'TEXT' | 'IMAGE' | 'MIXED';
    theme: 'PRIMARY' | 'ACCENT' | 'NEUTRAL' | 'DARK' | 'GRADIENT';
  };

  return <HeaderAdBarClient ad={ad} />;
}
