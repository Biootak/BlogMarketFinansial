import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'خطای غیرمنتظره | ۵۰۰',
  description: 'خطایی رخ داده که پیش‌بینی نشده بود. لطفاً دوباره تلاش کنید.',
  robots: { index: false, follow: false },
};

export default function ErrorPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
