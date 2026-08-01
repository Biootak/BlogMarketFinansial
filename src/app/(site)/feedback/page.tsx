import { getSiteIdentity } from '@/lib/site-identity';
import type { Metadata } from 'next';
import FeedbackForm from './FeedbackForm';
import s from './feedback.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  return {
    title: `بازخورد | ${siteName}`,
    description: 'نظر، پیشنهاد یا مشکل خود را با ما در میان بگذارید.',
    alternates: { canonical: '/feedback' },
  };
}

/**
 * /feedback — صفحهٔ بازخورد (H8-fix).
 *
 * قبلاً به /contact redirect می‌شد (بدون سطح بازخورد). حالا یک فرم بازخورد
 * واقعی با rating + پیام است که پیام را به ایمیل پشتیبانی ارسال می‌کند.
 */
export default async function FeedbackPage() {
  const { siteName } = await getSiteIdentity();

  return (
    <main className={s.page} dir="rtl">
      <div className={s.inner}>
        <header className={s.head}>
          <span className={s.eyebrow}>نظر شما ارزشمند است</span>
          <h1 className={s.title}>بازخورد شما</h1>
          <p className={s.sub}>
            نظر، پیشنهاد یا مشکلی که با {siteName} داشته‌اید را با ما در میان بگذارید.
            پاسخگویی در کمتر از ۳۰ دقیقه.
          </p>
        </header>
        <FeedbackForm />
      </div>
    </main>
  );
}
