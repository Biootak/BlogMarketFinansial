import { auth } from '@/auth';
import { getSiteIdentity } from '@/lib/site-identity';
import { ArrowLeft, ArrowUpDown, BarChart2, Globe, Lock, Shield, Wallet, Zap } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import WalletDashboard from './WalletDashboard';
import WalletHero from './WalletHero';
import s from './wallet.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  return {
    title: `کیف پول دیجیتال | ${siteName}`,
    description: 'مدیریت هوشمند دارایی‌های دیجیتال، انتقال امن و سریع پول با کیف پول دیجیتال فین‌تک.',
  };
}

const features = [
  {
    icon: ArrowUpDown,
    title: 'انتقال فوری',
    desc: 'ارسال و دریافت پول در کمتر از چند ثانیه به هر نقطه‌ای از افغانستان و ایران.',
  },
  {
    icon: Shield,
    title: 'امنیت بالا',
    desc: 'رمزنگاری درجه سازمانی، احراز هویت دو مرحله‌ای و نظارت ۲۴/۷.',
  },
  {
    icon: Zap,
    title: 'نرخ لحظه‌ای',
    desc: 'نرخ‌های ارز به‌روز هر ۵ دقیقه — بهترین نرخ را همیشه داشته باشید.',
  },
  {
    icon: Globe,
    title: 'پشتیبانی چند ارزی',
    desc: 'افغانی، ریال، دلار، تتر — همه در یک کیف پول.',
  },
  {
    icon: BarChart2,
    title: 'گزارش‌دهی هوشمند',
    desc: 'تحلیل تراکنش‌ها، صادرات گزارش و آمار کامل مالی.',
  },
  {
    icon: Lock,
    title: 'حریم خصوصی',
    desc: 'اطلاعات شما رمزنگاری‌شده و نزد ما محفوظ است. هرگز به اشخاص ثالث فروخته نمی‌شود.',
  },
] as const;

export default async function WalletPage() {
  const session = await auth();
  const userId = session?.user?.id;

  // اگر کاربر لاگین است → داشبورد واقعی (P1-3)
  if (userId) {
    return (
      <div className={s.root}>
        <section
          className={s.hero}
          aria-label="کیف پول دیجیتال"
          style={{ minHeight: 'auto', paddingBlock: 'var(--ds-space-6)' }}
        >
          <div className={s.content}>
            <div className={s.badge}>
              <span className={s.badgeDot} aria-hidden />
              کیف پول من
            </div>
            <h1 className={s.headline} style={{ fontSize: 'var(--ds-text-3xl)' }}>
              موجودی و تراکنش‌ها
            </h1>
          </div>
        </section>
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 var(--ds-space-4)' }}>
          <Suspense
            fallback={
              <div
                style={{
                  padding: 'var(--ds-space-8)',
                  textAlign: 'center',
                  color: 'var(--ds-text-muted)',
                  fontSize: 'var(--ds-text-sm)',
                }}
              >
                در حال بارگذاری کیف پول…
              </div>
            }
          >
            <WalletDashboard userId={userId} />
          </Suspense>
        </div>
      </div>
    );
  }

  // کاربر لاگین نیست → landing page عمومی
  return (
    <div className={s.root}>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className={s.hero} aria-label="کیف پول دیجیتال">
        {/* Client component for 3D glass cards */}
        <WalletHero />

        {/* Content column */}
        <div className={s.content}>
          {/* Badge */}
          <div className={s.badge}>
            <span className={s.badgeDot} aria-hidden />
            کیف پول دیجیتال ۱۴۰۴
          </div>

          {/* Headline */}
          <h1 className={s.headline}>
            پول خود را <span className={s.headlineAccent}>هوشمند</span> مدیریت کنید
          </h1>

          {/* Sub */}
          <p className={s.sub}>انتقال امن، نرخ لحظه‌ای و مدیریت چند‌ارزی — همه در یک پلتفرم ساده</p>

          {/* Pills */}
          <ul className={s.pills} aria-label="ویژگی‌های کلیدی">
            {[
              { icon: Globe, text: 'چند ارزی' },
              { icon: Zap, text: 'انتقال فوری' },
              { icon: Shield, text: 'کاملاً امن' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className={s.pill}>
                <Icon size={13} strokeWidth={1.75} aria-hidden />
                {text}
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className={s.ctas}>
            <Link href="/money-transfer" className={s.ctaPrimary}>
              <Wallet size={16} strokeWidth={1.75} aria-hidden />
              شروع کنید
            </Link>
            <Link href="/online-payment" className={s.ctaSecondary}>
              <BarChart2 size={16} strokeWidth={1.5} aria-hidden />
              <span>پرداخت آنلاین</span>
              <ArrowLeft size={15} strokeWidth={1.5} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section className={s.features} aria-label="ویژگی‌ها">
        <div className={s.featuresInner}>
          <div className={s.sectionEyebrow}>
            <Wallet size={13} strokeWidth={1.75} aria-hidden />
            چرا کیف پول ما؟
          </div>
          <h2 className={s.sectionTitle}>همه چیز در یک پلتفرم</h2>

          <div className={s.featureGrid}>
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className={s.featureCard}>
                <div className={s.featureIcon} aria-hidden>
                  <Icon size={20} strokeWidth={1.75} />
                </div>
                <h3 className={s.featureTitle}>{title}</h3>
                <p className={s.featureDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────── */}
      <div className={s.ctaBanner} role="complementary" aria-label="شروع کنید">
        <h2 className={s.bannerTitle}>آماده‌اید شروع کنید؟</h2>
        <p className={s.bannerSub}>
          همین حالا ثبت‌نام کنید و اولین تراکنش خود را در کمتر از ۵ دقیقه انجام دهید.
        </p>
        <div className={s.bannerCtas}>
          <Link href="/money-transfer" className={s.ctaPrimary}>
            <Wallet size={16} strokeWidth={1.75} aria-hidden />
            مشاهده نرخ‌ها
          </Link>
          <Link href="/#contact" className={s.ctaSecondary}>
            تماس با پشتیبانی
          </Link>
        </div>
      </div>
    </div>
  );
}
