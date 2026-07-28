'use client';

import {
  ArrowLeft,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  HelpCircle,
  Mail,
  Shield,
  Sparkles,
  User,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import s from './faq.module.css';

type FaqItem = {
  id: string;
  q: string;
  a: string;
  link?: { href: string; label: string };
};

type FaqGroup = {
  id: string;
  icon: React.ElementType;
  kicker: string;
  title: string;
  items: FaqItem[];
};

const GROUPS: readonly FaqGroup[] = [
  {
    id: 'general',
    icon: HelpCircle,
    kicker: 'گروه ۰۱',
    title: 'آشنایی با پلتفرم',
    items: [
      {
        id: 'what-is',
        q: 'پلتفرم Financial Market چه خدماتی ارائه می‌دهد؟',
        a: `ما یک پلتفرم جامع مالی هستیم که سه خدمت اصلی ارائه می‌دهیم:

• تحلیل و محتوای بازارهای مالی (بورس، ارز دیجیتال، طلا و ارز) به‌صورت روزانه
• صرافی آنلاین ارزهای دیجیتال و حواله‌های بین‌المللی
• خدمات پرداخت آنلاین و صدور کارت‌های مجازی برای کاربران

تمام خدمات ما تحت نظارت بانک مرکزی و با مجوز رسمی فعالیت می‌کنند.`,
        link: { href: '/about', label: 'درباره ما بیشتر بدانید' },
      },
      {
        id: 'who-can-use',
        q: 'چه کسانی می‌توانند از خدمات استفاده کنند؟',
        a: `تمام افراد بالای ۱۸ سال با مدارک شناسایی معتبر می‌توانند پس از تکمیل فرایند احراز هویت (KYC) از خدمات ما استفاده کنند. احراز هویت طبق الزامات قانونی مبارزه با پول‌شویی (AML) اجباری است و برای حفظ امنیت حساب شما انجام می‌شود.`,
        link: { href: '/kyc', label: 'شروع احراز هویت' },
      },
      {
        id: 'languages',
        q: 'زبان‌های پشتیبانی‌شده در پلتفرم کدام‌اند؟',
        a: 'در حال حاضر زبان فارسی زبان اصلی پلتفرم است. رابط کاربری کاملاً RTL و بهینه‌سازی‌شده برای کاربران فارسی‌زبان است. پشتیبانی از زبان انگلیسی در بروزرسانی‌های آتی اضافه خواهد شد.',
      },
    ],
  },
  {
    id: 'account',
    icon: User,
    kicker: 'گروه ۰۲',
    title: 'حساب کاربری و احراز هویت',
    items: [
      {
        id: 'register',
        q: 'چگونه ثبت‌نام کنم؟',
        a: `برای ثبت‌نام کافی است:

۱. روی دکمه «ثبت‌نام» در بالای صفحه کلیک کنید
۲. شماره موبایل یا ایمیل خود را وارد کنید
۳. کد تأیید ارسال‌شده را وارد کنید
۴. رمز عبور قوی انتخاب کنید

پس از ثبت‌نام اولیه می‌توانید بلافاصله از بخش‌های عمومی سایت استفاده کنید. برای دسترسی به خدمات مالی باید مراحل احراز هویت را تکمیل کنید.`,
        link: { href: '/auth', label: 'صفحه ثبت‌نام' },
      },
      {
        id: 'kyc-docs',
        q: 'چه مدارکی برای احراز هویت نیاز است؟',
        a: `مدارک مورد نیاز:

• تصویر واضح از رو و پشت کارت ملی یا شناسنامه
• عکس سلفی با کارت شناسایی در دست
• در صورت نیاز: مدرک آدرس (قبض خدماتی، اجاره‌نامه یا سند)
• برای تراکنش‌های بالای ۵۰۰ میلیون تومان: مدرک منبع وجه

بارگذاری مدارک در محیطی کاملاً امن با رمزنگاری end-to-end انجام می‌شود.`,
        link: { href: '/kyc', label: 'شروع احراز هویت' },
      },
      {
        id: 'kyc-time',
        q: 'احراز هویت چقدر طول می‌کشد؟',
        a: 'بررسی مدارک معمولاً بین ۱ تا ۲۴ ساعت کاری طول می‌کشد. در ۸۰٪ موارد، احراز هویت در کمتر از ۲ ساعت تأیید می‌شود. در صورت نیاز به مدارک تکمیلی، از طریق اعلان و ایمیل به شما اطلاع داده خواهد شد.',
      },
      {
        id: 'change-info',
        q: 'چگونه اطلاعات حسابم را تغییر دهم؟',
        a: 'برای تغییر اطلاعات حساب، وارد داشبورد شوید و از بخش «ویرایش پروفایل» اقدام کنید. تغییر نام و شماره موبایل نیاز به تأیید مجدد دارد. تغییر ایمیل با ارسال لینک تأیید به ایمیل قبلی و جدید انجام می‌شود.',
        link: { href: '/dashboard/edit-profile', label: 'ویرایش پروفایل' },
      },
    ],
  },
  {
    id: 'wallet',
    icon: Wallet,
    kicker: 'گروه ۰۳',
    title: 'کیف پول و تراکنش‌ها',
    items: [
      {
        id: 'wallet-types',
        q: 'چه نوع کیف پول‌هایی در دسترس است؟',
        a: `ما سه نوع کیف پول ارائه می‌دهیم:

• کیف پول ریالی (IRR) — برای تراکنش‌های بانکی
• کیف پول ارزی (USD, EUR, AED) — برای حواله‌های بین‌المللی
• کیف پول رمزارز (BTC, ETH, USDT و ۳۰+ ارز دیگر)

هر کیف پول دارای شبکه‌ی اختصاصی خود با کارمزد شفاف و سرعت انتقال متفاوت است.`,
        link: { href: '/dashboard/wallet', label: 'مشاهده کیف پول' },
      },
      {
        id: 'deposit',
        q: 'چگونه کیف پولم را شارژ کنم؟',
        a: `برای شارژ کیف پول:

۱. وارد داشبورد شوید
۲. به بخش «کیف پول» بروید
۳. نوع کیف پول مورد نظر را انتخاب کنید
۴. مبلغ و روش پرداخت (درگاه بانکی، کارت به کارت، ارز دیجیتال) را مشخص کنید

شارژ از طریق درگاه بانکی معمولاً آنی انجام می‌شود.`,
      },
      {
        id: 'withdraw-limit',
        q: 'سقف برداشت روزانه چقدر است؟',
        a: 'سقف برداشت بستگی به سطح احراز هویت شما دارد. کاربران سطح ۱ تا ۱۰۰ میلیون تومان، سطح ۲ تا ۵۰۰ میلیون تومان، و سطح ۳ (پس از احراز هویت کامل و حضوری) تا ۲ میلیارد تومان در روز برداشت دارند.',
      },
    ],
  },
  {
    id: 'trading',
    icon: CircleDollarSign,
    kicker: 'گروه ۰۴',
    title: 'معاملات و نرخ‌ها',
    items: [
      {
        id: 'rate-source',
        q: 'نرخ‌های ما از چه منابعی تأمین می‌شوند؟',
        a: `نرخ‌های ارزی ما از معتبرترین منابع بازار آزاد ایران جمع‌آوری می‌شوند:

• سامانه‌های رسمی صرافی‌های مجاز
• بازار آزاد ارز (بازار متشکل ارزی)
• منابع بین‌المللی (برای ارزهای خارجی)

نرخ‌ها هر ۳۰ ثانیه به‌روزرسانی می‌شوند و شما می‌توانید نمودار تغییرات ۲۴ ساعت گذشته را مشاهده کنید.`,
        link: { href: '/dashboard/exchange-rates', label: 'نرخ‌های زنده' },
      },
      {
        id: 'fees',
        q: 'کارمزد معاملات چقدر است؟',
        a: `ساختار کارمزد ما:

• تبدیل ارز: ۰.۱٪ تا ۰.۵٪ بسته به حجم تراکنش
• خرید و فروش رمزارز: ۰.۲٪
• حواله بین‌المللی: ۱.۵٪ (شامل هزینه‌های شبکه)
• برداشت ریالی: ۱,۰۰۰ تومان ثابت

برای کاربران پلن حرفه‌ای، تخفیف‌های ویژه‌ای در نظر گرفته شده است.`,
        link: { href: '/subscription', label: 'پلن‌های اشتراک' },
      },
      {
        id: 'order-types',
        q: 'چه نوع سفارش‌هایی پشتیبانی می‌شود؟',
        a: 'ما سفارش‌های بازار (Market) و محدود (Limit) را پشتیبانی می‌کنیم. سفارش‌های Limit تا ۳۰ روز معتبر هستند و در زمان رسیدن به قیمت مورد نظر به‌صورت خودکار اجرا می‌شوند.',
      },
    ],
  },
  {
    id: 'security',
    icon: Shield,
    kicker: 'گروه ۰۵',
    title: 'امنیت و حریم خصوصی',
    items: [
      {
        id: '2fa',
        q: 'آیا احراز هویت دو مرحله‌ای (2FA) فعال است؟',
        a: `بله، ما دو روش 2FA ارائه می‌دهیم:

• اپلیکیشن‌های Authenticator (Google Authenticator، Authy و ...)
• کدهای پشتیبان یک‌بار مصرف (برای مواقع اضطراری)

توصیه اکید ما فعال‌سازی 2FA برای تمامی حساب‌ها، به‌ویژه قبل از انجام تراکنش‌های بزرگ است.`,
        link: { href: '/dashboard/edit-profile', label: 'فعال‌سازی 2FA' },
      },
      {
        id: 'data-safety',
        q: 'اطلاعات شخصی من چگونه محافظت می‌شود؟',
        a: `ما از بالاترین استانداردهای امنیتی استفاده می‌کنیم:

• رمزنگاری AES-256 برای داده‌های ذخیره‌شده
• ارتباطات TLS 1.3 برای تمام درخواست‌ها
• ذخیره‌سازی در سرورهای امن اروپایی و خاورمیانه
• ممیزی دوره‌ای توسط شرکت‌های امنیتی معتبر بین‌المللی

هیچ‌گاه اطلاعات شما را بدون رضایت صریح با شخص ثالث به اشتراک نمی‌گذاریم.`,
        link: { href: '/privacy-policy', label: 'سیاست حریم خصوصی' },
      },
      {
        id: 'suspicious',
        q: 'اگر فعالیت مشکوکی در حسابم دیدم چه کنم؟',
        a: 'در صورت مشاهده هرگونه فعالیت مشکوک، فوراً رمز عبور خود را تغییر دهید و با پشتیبانی تماس بگیرید. تیم امنیتی ما به‌صورت ۲۴/۷ تراکنش‌ها را پایش می‌کند و در صورت لزوم حساب را موقتاً مسدود می‌کند.',
        link: { href: '/contact', label: 'تماس با پشتیبانی' },
      },
    ],
  },
  {
    id: 'support',
    icon: CreditCard,
    kicker: 'گروه ۰۶',
    title: 'پشتیبانی و خدمات',
    items: [
      {
        id: 'support-hours',
        q: 'ساعات پشتیبانی چگونه است؟',
        a: `پشتیبانی ما به‌صورت ۲۴/۷ از طریق چت آنلاین و تلفن در دسترس است.

• چت آنلاین: ۲۴ ساعته
• تلفن: ۹ صبح تا ۱۲ شب (۱۶ ساعت)
• ایمیل: پاسخ حداکثر تا ۲۴ ساعت کاری
• مرکز راهنما: همیشه در دسترس`,
        link: { href: '/contact', label: 'راه‌های تماس' },
      },
      {
        id: 'track-request',
        q: 'چگونه درخواست خدماتم را پیگیری کنم؟',
        a: 'پس از ثبت هر درخواست، یک کد رهگیری ۸ رقمی به شما داده می‌شود. با مراجعه به صفحه «پیگیری درخواست» و وارد کردن کد، می‌توانید وضعیت درخواست خود را به‌صورت لحظه‌ای مشاهده کنید.',
        link: { href: '/dashboard/my-requests', label: 'درخواست‌های من' },
      },
      {
        id: 'feedback',
        q: 'چگونه بازخورد یا شکایت ثبت کنم؟',
        a: 'ما ارزشمندترین منبع بهبود را نظرات شما می‌دانیم. از طریق صفحه «تماس با ما» یا ایمیل support@financialmarket.com می‌توانید بازخورد خود را ارسال کنید. تمام پیام‌ها در کمتر از ۲۴ ساعت پاسخ داده می‌شوند.',
        link: { href: '/contact', label: 'ارسال بازخورد' },
      },
    ],
  },
] as const;

function toFaDigits(n: number): string {
  return n.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

export function FaqContent() {
  const [activeGroup, setActiveGroup] = useState<string | 'all'>('all');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredGroups = useMemo(() => {
    if (activeGroup === 'all') return GROUPS;
    return GROUPS.filter((g) => g.id === activeGroup);
  }, [activeGroup]);

  const totalCount = useMemo(() => GROUPS.reduce((sum, g) => sum + g.items.length, 0), []);

  const scrollToGroup = (id: string) => {
    const el = document.getElementById(`faq-group-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      {/* Category chips */}
      <div className={s.chips} role="tablist" aria-label="دسته‌بندی پرسش‌ها">
        <button
          type="button"
          onClick={() => setActiveGroup('all')}
          className={`${s.chip} ${activeGroup === 'all' ? s.chipActive : ''}`}
          aria-pressed={activeGroup === 'all'}
        >
          <Sparkles size={12} strokeWidth={2} aria-hidden />
          همه پرسش‌ها
          <span className={s.chipCount}>{toFaDigits(totalCount)}</span>
        </button>
        {GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => {
              setActiveGroup(g.id);
              scrollToGroup(g.id);
            }}
            className={`${s.chip} ${activeGroup === g.id ? s.chipActive : ''}`}
            aria-pressed={activeGroup === g.id}
          >
            {g.title}
            <span className={s.chipCount}>{toFaDigits(g.items.length)}</span>
          </button>
        ))}
      </div>

      <div className={s.layout}>
        {/* TOC */}
        <nav className={s.toc} aria-label="فهرست موضوعات">
          <div className={s.tocTitle}>
            <Sparkles size={11} strokeWidth={2} aria-hidden />
            موضوعات
          </div>
          <ol className={s.tocList}>
            {GROUPS.map((g, i) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveGroup(g.id);
                    scrollToGroup(g.id);
                  }}
                  className={s.tocItem}
                >
                  <span>{toFaDigits(i + 1).padStart(2, '۰')}</span>
                  {g.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* Content */}
        <div className={s.content}>
          {filteredGroups.map((group) => {
            const Icon = group.icon;
            return (
              <section
                key={group.id}
                id={`faq-group-${group.id}`}
                className={s.group}
                aria-labelledby={`faq-group-${group.id}-title`}
              >
                <header className={s.groupHeader}>
                  <div className={s.groupIcon} aria-hidden>
                    <Icon size={18} strokeWidth={1.75} />
                  </div>
                  <h2 id={`faq-group-${group.id}-title`} className={s.groupTitle}>
                    {group.title}
                  </h2>
                  <span className={s.groupKicker}>{group.kicker}</span>
                </header>

                {group.items.map((item, i) => {
                  const isOpen = !!openItems[item.id];
                  return (
                    <article
                      key={item.id}
                      className={`${s.item} ${isOpen ? s.itemOpen : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        className={s.itemButton}
                        aria-expanded={isOpen}
                        aria-controls={`faq-body-${item.id}`}
                      >
                        <span className={s.itemNum}>{toFaDigits(i + 1)}</span>
                        <span>{item.q}</span>
                        <ChevronDown
                          size={16}
                          strokeWidth={2}
                          className={s.itemChevron}
                          aria-hidden
                        />
                      </button>
                      {isOpen ? (
                        <div id={`faq-body-${item.id}`} className={s.itemBody} role="region">
                          <p style={{ whiteSpace: 'pre-line' }}>{item.a}</p>
                          {item.link ? (
                            <Link href={item.link.href} className={s.itemLink}>
                              <span>{item.link.label}</span>
                              <ArrowLeft size={12} strokeWidth={2} aria-hidden />
                            </Link>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </section>
            );
          })}

          {/* Help footer */}
          <div className={s.helpFooter}>
            <div className={s.helpFooterIcon} aria-hidden>
              <Mail size={22} strokeWidth={1.75} />
            </div>
            <div>
              <h3 className={s.helpFooterTitle}>پاسخ سؤال خود را پیدا نکردید؟</h3>
              <p className={s.helpFooterText}>
                تیم پشتیبانی ما به‌صورت ۲۴ ساعته آماده پاسخگویی است. کافی است از طریق یکی از راه‌های ارتباطی
                زیر با ما در تماس باشید.
              </p>
            </div>
            <Link href="/contact" className={s.helpFooterCta}>
              <span>تماس با پشتیبانی</span>
              <ArrowLeft size={13} strokeWidth={2} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
