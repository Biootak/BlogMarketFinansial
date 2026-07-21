/**
 * (fintech) route group layout
 *
 * این layout برای مسیرهای عمومی فین‌تک (مثل /transfer) استفاده می‌شود.
 * از سایت اصلی (site) layout import می‌کند — header/footer یکسان دارد.
 *
 * #3 fix: Suspense fallback اضافه شد — بدون آن streaming shell خالی بود
 */
import { type ReactNode, Suspense } from 'react';

export default function FintechLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
