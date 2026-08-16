import { permanentRedirect } from 'next/navigation';

/**
 * 2026-08-16: صفحه پرداخت آنلاین با صفحه خدمات ادغام شد — همه خدمات (ارز،
 * حواله، پرداخت آنلاین، شارژ موبایل، قبض، بلیط سفر، شهریه و…) در یک بازارچه
 * واحد /services نمایش داده می‌شوند. این مسیر برای لینک‌های قدیمی حفظ شده و
 * با redirect دائمی به بازارچه می‌رود (گروه پرداخت باز شده است).
 */
export default function OnlinePaymentPage() {
  permanentRedirect('/services?group=payment');
}
