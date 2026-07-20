/**
 * (fintech) route group layout
 *
 * این layout برای مسیرهای عمومی فین‌تک (مثل /transfer) استفاده می‌شود.
 * از سایت اصلی (site) layout import می‌کند — header/footer یکسان دارد.
 */
import type { ReactNode } from 'react';

export default function FintechLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
