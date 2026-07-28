import { redirect } from 'next/navigation';

export default function PublicExchangeRatesPage() {
  // /exchange-rates — نرخ‌های ارز عمومی؛ هدایت به صفحه حواله
  redirect('/money-transfer');
}
