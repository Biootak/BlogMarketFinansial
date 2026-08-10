/**
 * /dashboard/kyc — redirect به /customer/kyc (canonical KYC)
 *
 * پورتال مشتری بهترین تجربه KYC را دارد — tiered levels + dialog + history.
 * این صفحه فقط redirect می‌کند تا backward compatibility حفظ شود.
 */
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'احراز هویت (KYC) | داشبورد',
  description: 'تکمیل اطلاعات هویتی برای استفاده از خدمات مالی',
};

export default function KycRedirectPage() {
  redirect('/customer/kyc');
}