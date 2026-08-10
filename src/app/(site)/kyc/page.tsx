/**
 * /kyc — Landing + redirect به /customer/kyc (canonical KYC)
 *
 * کاربران لاگین‌شده → redirect مستقیم به پورتال مشتری
 * کاربران مهمان → landing page زیبا با CTA لاگین/ثبت‌نام
 */
import { auth } from '@/auth';
import { ShieldCheck, Sparkles, Lock, Clock } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import s from './kyc-landing.module.css';

export const metadata = {
  title: 'احراز هویت (KYC) | تأیید هویت امن',
  description:
    'احراز هویت ۳ سطحی — از تأیید موبایل تا مدارک کامل. سریع، امن، مطابق استانداردهای FATF.',
};

export default async function KycLandingPage() {
  const session = await auth();

  // کاربران لاگین‌شده مستقیم به پورتال مشتری هدایت می‌شوند
  if (session?.user?.id) {
    redirect('/customer/kyc');
  }

  return (
    <div className={s.root}>
      {/* ── Ambient ── */}
      <div className={s.ambient} aria-hidden />

      {/* ── Hero ── */}
      <section className={s.hero}>
        <div className={s.heroInner}>
          <div className={s.badge}>
            <ShieldCheck size={14} aria-hidden />
            <span>گیت اعتماد</span>
          </div>

          <h1 className={s.title}>
            احراز هویت{' '}
            <span className={s.accent}>
              ۳ سطحی
              <Sparkles size={16} className={s.sparkle} aria-hidden />
            </span>
          </h1>

          <p className={s.lead}>
            از تأیید شماره موبایل تا مدارک کامل — هر سطح بعد از تأیید قبلی باز می‌شود.
            <br />
            اطلاعات شما رمزنگاری‌شده ذخیره و فقط برای بررسی استفاده می‌شود.
          </p>

          <div className={s.actions}>
            <Link href="/signin?callbackUrl=/customer/kyc" className={s.primaryBtn}>
              ورود و شروع احراز هویت
            </Link>
            <Link href="/signup?callbackUrl=/customer/kyc" className={s.secondaryBtn}>
              ثبت‌نام حساب جدید
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className={s.features}>
        <div className={s.featureCard}>
          <div className={s.featureIcon} data-tone="speed">
            <Clock size={20} aria-hidden />
          </div>
          <h3 className={s.featureTitle}>بررسی سریع</h3>
          <p className={s.featureDesc}>
            معمولاً کمتر از ۲۴ ساعت — سطح ۱ (موبایل) تقریباً آنی.
          </p>
        </div>

        <div className={s.featureCard}>
          <div className={s.featureIcon} data-tone="secure">
            <Lock size={20} aria-hidden />
          </div>
          <h3 className={s.featureTitle}>امنیت بالا</h3>
          <p className={s.featureDesc}>
            رمزنگاری سرتاسری — مدارک فقط برای بررسی تیم KYC قابل مشاهده.
          </p>
        </div>

        <div className={s.featureCard}>
          <div className={s.featureIcon} data-tone="tier">
            <ShieldCheck size={20} aria-hidden />
          </div>
          <h3 className={s.featureTitle}>۳ سطح پیشرو</h3>
          <p className={s.featureDesc}>
            هر سطح سقف تراکنش بالاتر — از موبایل تا صورتحساب بانکی.
          </p>
        </div>
      </section>

      {/* ── Levels Preview ── */}
      <section className={s.levels}>
        <h2 className={s.sectionTitle}>مراحل احراز هویت</h2>
        <div className={s.levelCards}>
          <div className={s.levelCard}>
            <span className={s.levelNumber}>۱</span>
            <h4 className={s.levelName}>موبایل و تلگرام</h4>
            <p className={s.levelDesc}>تأیید شماره با کد تلگرام — سریع‌ترین شروع</p>
          </div>
          <div className={s.levelCard}>
            <span className={s.levelNumber}>۲</span>
            <h4 className={s.levelName}>مدرک و سلفی</h4>
            <p className={s.levelDesc}>تذکره/کارت ملی + سلفی تأیید چهره</p>
          </div>
          <div className={s.levelCard}>
            <span className={s.levelNumber}>۳</span>
            <h4 className={s.levelName}>آدرس و صورتحساب</h4>
            <p className={s.levelDesc}>سند آدرس + صورت حساب بانکی — بالاترین سقف</p>
          </div>
        </div>
      </section>
    </div>
  );
}