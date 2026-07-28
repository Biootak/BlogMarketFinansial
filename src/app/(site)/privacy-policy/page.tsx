import { getSiteIdentity } from '@/lib/site-identity';
import {
  ArrowLeft,
  Clock,
  Database,
  Eye,
  FileLock2,
  Globe,
  Lock,
  Mail,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import s from './privacy-policy.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  const name = siteName || 'پلتفرم مالی';
  return {
    title: `حریم خصوصی | ${name}`,
    description: `سیاست‌های حریم خصوصی، نحوه جمع‌آوری، ذخیره‌سازی و حفاظت از اطلاعات شخصی شما در ${name}.`,
    alternates: { canonical: '/privacy-policy' },
  };
}

type Section = {
  id: string;
  icon: typeof ShieldCheck;
  kicker: string;
  title: string;
  body: string;
};

const sections: readonly Section[] = [
  {
    id: 'collect',
    icon: Database,
    kicker: 'بخش ۰۱',
    title: 'اطلاعاتی که جمع‌آوری می‌کنیم',
    body: `ما فقط اطلاعاتی را جمع‌آوری می‌کنیم که برای ارائه خدمات مالی، احراز هویت و بهبود تجربه شما ضروری است. این اطلاعات در سه دسته اصلی قرار می‌گیرند:

۱. اطلاعات حساب کاربری: نام، آدرس ایمیل، شماره تماس، رمز عبور (به‌صورت رمزنگاری‌شده) و تصویر پروفایل.
۲. اطلاعات احراز هویت (KYC): تصویر کارت شناسایی معتبر، عکس سلفی تأییدی و اطلاعات بانکی فقط در صورت نیاز به خدمات پرداخت.
۳. داده‌های استفاده: آدرس IP، نوع مرورگر، صفحات بازدیدشده، زمان بازدید و تعاملات شما با پلتفرم برای بهینه‌سازی خدمات.

ما هرگز اطلاعات شخصی شما را بدون رضایت صریح شما با اشخاص ثالث به اشتراک نمی‌گذاریم.`,
  },
  {
    id: 'use',
    icon: Eye,
    kicker: 'بخش ۰۲',
    title: 'نحوه استفاده از اطلاعات',
    body: `اطلاعات جمع‌آوری‌شده صرفاً برای اهداف زیر استفاده می‌شود:

• ارائه خدمات اصلی پلتفرم شامل نمایش محتوا، ثبت درخواست‌ها و انجام تراکنش‌های مالی.
• احراز هویت، جلوگیری از تقلب و رعایت الزامات قانونی پول‌شویی و شناسایی مشتری (KYC/AML).
• بهبود عملکرد، امنیت و تجربه کاربری از طریق تحلیل‌های آماری ناشناس.
• ارسال اطلاعیه‌های ضروری درباره حساب، تراکنش‌ها و تغییرات مهم در شرایط خدمات.
• پاسخ به درخواست‌های پشتیبانی و ارتباط با شما در موارد ضروری.

استفاده تبلیغاتی از اطلاعات شما تنها با رضایت صریح و قابل لغو شما امکان‌پذیر است.`,
  },
  {
    id: 'storage',
    icon: Server,
    kicker: 'بخش ۰۳',
    title: 'محل و مدت ذخیره‌سازی',
    body: `داده‌های شما بر روی سرورهای امن در مراکز داده معتبر اروپایی و خاورمیانه ذخیره می‌شوند. تمامی ارتباطات با استاندارد TLS 1.3 رمزنگاری شده و داده‌ها در حالت سکون (at-rest) با الگوریتم AES-256 محافظت می‌شوند.

مدت نگهداری داده‌ها:
• اطلاعات حساب: تا زمانی که حساب شما فعال است + ۲ سال پس از آخرین فعالیت.
• مدارک احراز هویت: حداکثر ۵ سال پس از پایان همکاری (الزام قانونی).
• گزارش‌های مالی و تراکنش‌ها: ۱۰ سال (الزام حسابداری و مالیاتی).

پس از پایان دوره نگهداری، داده‌ها به‌صورت ایمن و مطابق با استانداردهای بین‌المللی حذف یا ناشناس‌سازی می‌شوند.`,
  },
  {
    id: 'protect',
    icon: ShieldCheck,
    kicker: 'بخش ۰۴',
    title: 'حفاظت و امنیت اطلاعات',
    body: `ما امنیت داده‌های شما را با لایه‌های متعدد حفاظتی تضمین می‌کنیم:

• رمزنگاری end-to-end برای ارتباطات حساس.
• احراز هویت دو مرحله‌ای (2FA) به‌عنوان یک لایه امنیتی اضافی برای حساب‌های کاربری.
• پایش ۲۴/۷ تراکنش‌ها و تشخیص خودکار فعالیت‌های مشکوک.
• ممیزی دوره‌ای امنیتی توسط تیم‌های متخصص داخلی و شرکای معتبر بین‌المللی.
• دسترسی داخلی به داده‌ها فقط بر اساس اصل «نیاز به دانستن» و با ثبت دقیق ممیزی.

در صورت بروز هرگونه نقض امنیتی، ظرف ۷۲ ساعت به شما و مراجع ذیصلاح قانونی اطلاع‌رسانی خواهد شد.`,
  },
  {
    id: 'cookies',
    icon: FileLock2,
    kicker: 'بخش ۰۵',
    title: 'کوکی‌ها و فناوری‌های مشابه',
    body: `ما از کوکی‌ها برای بهبود تجربه شما، احراز هویت و تحلیل ترافیک استفاده می‌کنیم. کوکی‌های ما در سه دسته قرار می‌گیرند:

۱. کوکی‌های ضروری: برای ورود، امنیت و عملکرد اصلی سایت ضروری هستند و قابل غیرفعال‌سازی نیستند.
۲. کوکی‌های عملکردی: تنظیمات شما مانند زبان، تم تاریک/روشن و ترجیحات نمایش را ذخیره می‌کنند.
۳. کوکی‌های تحلیلی: به‌صورت ناشناس رفتار کاربران را بررسی می‌کنند تا خدمات را بهبود دهیم.

شما می‌توانید از طریق تنظیمات مرورگر خود کوکی‌های غیرضروری را مدیریت یا حذف کنید.`,
  },
  {
    id: 'share',
    icon: Users,
    kicker: 'بخش ۰۶',
    title: 'اشتراک‌گذاری با اشخاص ثالث',
    body: `ما هرگز داده‌های شخصی شما را نمی‌فروشیم. اشتراک‌گذاری اطلاعات فقط در موارد زیر و با حداقل داده‌ی ضروری انجام می‌شود:

• ارائه‌دهندگان خدمات زیرساختی (میزبانی، ایمیل، پردازش پرداخت) تحت قرارداد محرمانگی.
• مراجع قانونی و نظارتی فقط در مواردی که حکم قضائی معتبر ارائه شود.
• شرکای تجاری تنها با رضایت صریح شما (مثلاً هنگام پرداخت از طریق درگاه بانکی).

تمام شرکای ما ملزم به رعایت استانداردهای حداقلی حفاظت داده (GDPR / استانداردهای مشابه) هستند.`,
  },
  {
    id: 'transfer',
    icon: Globe,
    kicker: 'بخش ۰۷',
    title: 'انتقال بین‌المللی داده',
    body: `با توجه به ماهیت فرامرزی خدمات مالی، ممکن است برخی از داده‌های شما در کشورهای مختلف پردازش شوند. در این موارد:

• انتقال فقط به کشورهایی انجام می‌شود که سطح حفاظت داده قابل قبول دارند.
• در صورت نیاز به انتقال به کشورهای فاقد تصمیم کافی، از تدابیر حفاظتی قراردادی مناسب استفاده می‌کنیم.
• همواره حداقل داده‌ی ضروری منتقل می‌شود.`,
  },
] as const;

const rights = [
  {
    icon: Eye,
    title: 'حق دسترسی',
    desc: 'در هر زمان می‌توانید نسخه‌ای از اطلاعات خود را درخواست کنید.',
  },
  {
    icon: UserCheck,
    title: 'حق تصحیح',
    desc: 'اطلاعات نادرست را می‌توانید از طریق تنظیمات حساب اصلاح کنید.',
  },
  {
    icon: Trash2,
    title: 'حق حذف',
    desc: 'می‌توانید درخواست حذف کامل حساب و داده‌های خود را ارائه دهید.',
  },
  {
    icon: Lock,
    title: 'حق محدودسازی',
    desc: 'می‌توانید پردازش برخی داده‌ها را محدود یا متوقف کنید.',
  },
] as const;

export default function PrivacyPolicyPage() {
  return (
    <div className={s.page}>
      <div className="container">
        {/* ── Page header ────────────────────────────────────── */}
        <header className={s.header}>
          <div className={s.eyebrow}>
            <Lock size={13} strokeWidth={1.75} aria-hidden />
            حریم خصوصی
          </div>
          <h1 className={s.title}>
            حفاظت از <span className={s.titleAccent}>حریم خصوصی</span> شما
          </h1>
          <p className={s.sub}>
            ما شفافانه توضیح می‌دهیم که چه اطلاعاتی جمع‌آوری می‌کنیم، چگونه از آن استفاده می‌کنیم و
            چه حق انتخابی به شما می‌دهیم. امنیت و اعتماد شما اولویت ماست.
          </p>
        </header>

        {/* ── Trust strip ────────────────────────────────────── */}
        <div className={s.trustStrip} aria-label="اصول کلیدی">
          <span className={s.trustChip}>
            <span className={s.trustChipIcon} aria-hidden>
              <ShieldCheck size={12} strokeWidth={2} />
            </span>
            رمزنگاری AES-256
          </span>
          <span className={s.trustChipDivider} aria-hidden />
          <span className={s.trustChip}>
            <span className={s.trustChipIcon} aria-hidden>
              <UserCheck size={12} strokeWidth={2} />
            </span>
            مطابق GDPR
          </span>
          <span className={s.trustChipDivider} aria-hidden />
          <span className={s.trustChip}>
            <span className={s.trustChipIcon} aria-hidden>
              <Sparkles size={12} strokeWidth={2} />
            </span>
            بدون فروش داده
          </span>
        </div>

        {/* ── Last updated ───────────────────────────────────── */}
        <div style={{ textAlign: 'center' }}>
          <span className={s.updateBadge}>
            <Clock size={12} strokeWidth={1.75} aria-hidden />
            آخرین به‌روزرسانی: تیر ۱۴۰۵
          </span>
        </div>

        {/* ── Layout ─────────────────────────────────────────── */}
        <div className={s.layout}>
          {/* Table of contents */}
          <nav className={s.toc} aria-label="فهرست مطالب">
            <div className={s.tocTitle}>
              <Sparkles size={12} strokeWidth={2} aria-hidden />
              فهرست
            </div>
            <ol className={s.tocList}>
              {sections.map((sec, i) => (
                <li key={sec.id}>
                  <a href={`#pp-${sec.id}`} className={s.tocItem}>
                    <span className={s.tocNum}>{String(i + 1).padStart(2, '۰')}</span>
                    {sec.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Content */}
          <div className={s.content}>
            {sections.map((sec) => {
              const Icon = sec.icon;
              return (
                <article key={sec.id} id={`pp-${sec.id}`} className={s.section}>
                  <header className={s.sectionHeader}>
                    <div className={s.sectionIcon} aria-hidden>
                      <Icon size={18} strokeWidth={1.75} />
                    </div>
                    <div className={s.sectionTitleGroup}>
                      <h2 className={s.sectionTitle}>{sec.title}</h2>
                      <span className={s.sectionKicker}>{sec.kicker}</span>
                    </div>
                  </header>
                  <p className={s.sectionBody}>{sec.body}</p>
                </article>
              );
            })}

            {/* Your rights */}
            <article id="pp-rights" className={s.section}>
              <header className={s.sectionHeader}>
                <div className={s.sectionIcon} aria-hidden>
                  <UserCheck size={18} strokeWidth={1.75} />
                </div>
                <div className={s.sectionTitleGroup}>
                  <h2 className={s.sectionTitle}>حقوق شما</h2>
                  <span className={s.sectionKicker}>بخش ۰۸</span>
                </div>
              </header>
              <p className={s.sectionBody}>
                شما نسبت به اطلاعات شخصی خود حقوق زیر را دارید. برای استفاده از هر یک از این
                حقوق، کافی است از طریق صفحه تماس با ما درخواست خود را ثبت کنید. ما ظرف حداکثر
                ۳۰ روز کاری پاسخ خواهیم داد.
              </p>

              <div className={s.rightsGrid}>
                {rights.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className={s.rightCard}>
                    <div className={s.rightIcon} aria-hidden>
                      <Icon size={16} strokeWidth={1.75} />
                    </div>
                    <div className={s.rightContent}>
                      <h3 className={s.rightTitle}>{title}</h3>
                      <p className={s.rightDesc}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className={s.callout}>
                <div className={s.calloutIcon} aria-hidden>
                  <Sparkles size={14} strokeWidth={1.75} />
                </div>
                <div className={s.calloutBody}>
                  <h3 className={s.calloutTitle}>شفافیت کامل</h3>
                  <p className={s.calloutText}>
                    تمام درخواست‌های مربوط به حقوق شما رایگان و بدون نیاز به توضیح علت هستند.
                    در صورت نیاز به تأیید هویت، فقط از روش‌های امن استفاده می‌کنیم.
                  </p>
                </div>
              </div>
            </article>

            {/* Changes */}
            <article id="pp-changes" className={s.section}>
              <header className={s.sectionHeader}>
                <div className={s.sectionIcon} aria-hidden>
                  <FileLock2 size={18} strokeWidth={1.75} />
                </div>
                <div className={s.sectionTitleGroup}>
                  <h2 className={s.sectionTitle}>تغییرات در این سیاست‌نامه</h2>
                  <span className={s.sectionKicker}>بخش ۰۹</span>
                </div>
              </header>
              <p className={s.sectionBody}>
                ما ممکن است این سیاست‌نامه را در آینده به‌روزرسانی کنیم. هر تغییر اساسی از
                طریق ایمیل یا اعلان درون‌برنامه‌ای به شما اطلاع داده خواهد شد. تاریخ آخرین
                به‌روزرسانی در بالای این صفحه نمایش داده می‌شود. ادامه استفاده شما از خدمات پس
                از تغییرات، به معنای پذیرش شرایط جدید است.
              </p>
            </article>

            {/* Contact card */}
            <div className={s.contactCard}>
              <div className={s.contactIcon} aria-hidden>
                <Mail size={22} strokeWidth={1.75} />
              </div>
              <div className={s.contactBody}>
                <h3 className={s.contactTitle}>سؤالی درباره حریم خصوصی دارید؟</h3>
                <p className={s.contactText}>
                  تیم حریم خصوصی ما آماده پاسخگویی به شماست. ظرف ۲۴ ساعت پاسخ خواهیم داد.
                </p>
              </div>
              <Link href="/contact" className={s.contactCta}>
                تماس با ما
                <ArrowLeft
                  size={14}
                  strokeWidth={2}
                  style={{ transform: 'scaleX(-1)' }}
                  aria-hidden
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
