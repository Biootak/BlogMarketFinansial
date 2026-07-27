import type { Metadata } from 'next';
import CryptoPortalClient from './_components/CryptoPortalClient';

export const metadata: Metadata = {
  title: 'تبادل ارز دیجیتال',
  description: 'خرید، فروش و مدیریت دارایی‌های دیجیتال در پلتفرم مالی',
};

export default function CryptoPortalPage() {
  return <CryptoPortalClient />;
}
