import { permanentRedirect } from 'next/navigation';

export default function OnlinePaymentCatchAll() {
  // 2026-08-16: با صفحه خدمات ادغام شد — مستقیم به بازارچه می‌رود.
  permanentRedirect('/services?group=payment');
}
