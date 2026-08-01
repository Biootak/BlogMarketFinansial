'use client';

import {
  ArrowLeft,
  BookOpen,
  CircleHelp,
  CreditCard,
  Headphones,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
  Search as SearchIcon,
  Shield,
  Sparkles,
  TrendingUp,
  User,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import s from './help-center.module.css';

type Category = {
  id: string;
  icon: React.ElementType;
  count: number;
  title: string;
  desc: string;
  items: string[];
  href: string;
};

const CATEGORIES: readonly Category[] = [
  {
    id: 'getting-started',
    icon: BookOpen,
    count: 12,
    title: 'شروع کار با پلتفرم',
    desc: 'راهنمای گام‌به‌گام ثبت‌نام، تنظیم حساب و اولین تراکنش شما.',
    items: [
      'ساخت حساب کاربری در ۳ دقیقه',
      'تکمیل احراز هویت (KYC)',
      'فعالسازی 2FA برای امنیت بیشتر',
      'اولین واریز و برداشت',
    ],
    href: '/kyc',
  },
  {
    id: 'wallet',
    icon: Wallet,
    count: 8,
    title: 'کیف پول و تراکنش‌ها',
    desc: 'نحوه مدیریت کیف پول، انتقال وجه و پیگیری تراکنش‌ها.',
    items: [
      'شارژ کیف پول ریالی',
      'تبدیل ارز در کیف پول',
      'برداشت امن با احراز ۲ مرحله‌ای',
      'گزارش تراکنش‌ها',
    ],
    href: '/dashboard/wallet',
  },
  {
    id: 'trading',
    icon: TrendingUp,
    count: 15,
    title: 'معاملات و صرافی',
    desc: 'راهنمای کامل معامله، تحلیل بازار و استفاده از ابزارهای حرفه‌ای.',
    items: [
      'سفارش سریع (Market Order)',
      'سفارش شرطی (Limit Order)',
      'تحلیل تکنیکال و نمودارها',
      'استفاده از ماشین‌حساب سود',
    ],
    href: '/dashboard/exchange-rates',
  },
  {
    id: 'security',
    icon: Shield,
    count: 10,
    title: 'امنیت و حریم خصوصی',
    desc: 'محافظت از حساب، تشخیص تهدید و رعایت بهترین شیوه‌های امنیتی.',
    items: [
      'فعالسازی احراز هویت دو مرحلهای',
      'مدیریت دستگاه‌های متصل',
      'تشخیص ایمیل و لینک جعلی',
      'گزارش فعالیت مشکوک',
    ],
    href: '/privacy-policy',
  },
  {
    id: 'account',
    icon: User,
    count: 9,
    title: 'مدیریت حساب',
    desc: 'تنظیمات حساب، تغییر اطلاعات، اشتراک‌ها و سطوح دسترسی.',
    items: [
      'ویرایش پروفایل و تغییر رمز',
      'مدیریت اعلان‌ها و ایمیل',
      'سطوح اشتراک و امکانات',
      'حذف یا غیرفعالسازی حساب',
    ],
    href: '/dashboard/edit-profile',
  },
  {
    id: 'billing',
    icon: CreditCard,
    count: 7,
    title: 'اشتراک و صورتحساب',
    desc: 'مدیریت پلن‌های اشتراک، فاکتورها و روش‌های پرداخت.',
    items: [
      'ارتقا یا تغییر پلن اشتراک',
      'مشاهده سوابق پرداخت',
      'روش‌های پرداخت پشتیبانی‌شده',
      'مالیات و کارمزدها',
    ],
    href: '/subscription',
  },
];

function toFaDigits(n: number): string {
  return n.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

interface HelpCenterContentProps {
  phone?: string;
  email?: string;
}

export function HelpCenterContent({ phone, email }: HelpCenterContentProps = {}) {
  const router = useRouter();
  const [q, setQ] = useState('');

  const onSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/search');
    }
  };

  return (
    <>
      {/* System status banner */}
      <div className={s.status} role="status" aria-live="polite">
        <span className={s.statusDot} aria-hidden />
        <span className={s.statusText}>
          <strong>همه‌ی خدمات فعال هستند.</strong> آخرین بررسی: لحظاتی پیش.
        </span>
        <span className={s.statusMeta}>۹۹.۹۸٪ پایداری</span>
      </div>

      {/* Hero */}
      <header className={s.hero}>
        <div className={s.eyebrow}>
          <LifeBuoy size={13} strokeWidth={1.75} aria-hidden />
          مرکز راهنما
        </div>
        <h1 className={s.title}>
          چطور <span className={s.titleAccent}>می‌توانیم کمکتان کنیم؟</span>
        </h1>
        <p className={s.sub}>
          در مرکز راهنمای ما، پاسخ اکثر سؤالات شما در چند ثانیه پیدا می‌شود. اگر پاسخ خود را نیافتید،
          تیم پشتیبانی ۲۴/۷ آماده کمک به شماست.
        </p>

        <form
          onSubmit={onSearch}
          className={s.searchForm}
          role="search"
          aria-label="جستجو در راهنما"
        >
          <span className={s.searchIcon} aria-hidden>
            <SearchIcon size={18} strokeWidth={1.75} />
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو در راهنما، مقالات و خدمات…"
            className={s.searchInput}
            autoComplete="off"
            aria-label="عبارت جستجو"
          />
          <button type="submit" className={s.searchSubmit} aria-label="ارسال جستجو">
            <span>جستجو</span>
            <ArrowLeft size={12} strokeWidth={2} aria-hidden />
          </button>
        </form>
      </header>

      {/* Quick stats */}
      <div className={s.stats}>
        <Link href="/faq" className={s.stat}>
          <span className={s.statIcon} aria-hidden>
            <CircleHelp size={16} strokeWidth={1.75} />
          </span>
          <span className={s.statBody}>
            <span className={s.statValue}>{toFaDigits(120)}+</span>
            <span className={s.statLabel}>سؤال متداول</span>
          </span>
        </Link>
        <Link href="/archive" className={s.stat}>
          <span className={s.statIcon} aria-hidden>
            <BookOpen size={16} strokeWidth={1.75} />
          </span>
          <span className={s.statBody}>
            <span className={s.statValue}>{toFaDigits(80)}+</span>
            <span className={s.statLabel}>راهنمای تصویری</span>
          </span>
        </Link>
        <Link href="/contact" className={s.stat}>
          <span className={s.statIcon} aria-hidden>
            <Headphones size={16} strokeWidth={1.75} />
          </span>
          <span className={s.statBody}>
            <span className={s.statValue}>۲۴/۷</span>
            <span className={s.statLabel}>پشتیبانی زنده</span>
          </span>
        </Link>
      </div>

      {/* Categories grid */}
      <h2 className={s.sectionTitle}>
        <Sparkles
          size={16}
          strokeWidth={1.75}
          aria-hidden
          style={{ color: 'var(--ds-brand-600)' }}
        />
        موضوعات پرطرفدار
        <span className={s.sectionKicker}>{toFaDigits(CATEGORIES.length)} دسته</span>
      </h2>

      <div className={s.grid}>
        {CATEGORIES.map((cat, i) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.id}
              href={cat.href}
              className={s.card}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={s.cardHeader}>
                <span className={s.cardIcon} aria-hidden>
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <div className={s.cardMeta}>
                  <span className={s.cardCount}>{toFaDigits(cat.count)} مقاله</span>
                  <span className={s.cardTitle}>{cat.title}</span>
                </div>
              </div>
              <p className={s.cardDesc}>{cat.desc}</p>
              <ul className={s.cardList}>
                {cat.items.map((item) => (
                  <li key={item} className={s.cardListItem}>
                    {item}
                  </li>
                ))}
              </ul>
              <span className={s.cardCta}>
                <span>مشاهده همه</span>
                <ArrowLeft size={12} strokeWidth={2} aria-hidden />
              </span>
            </Link>
          );
        })}
      </div>

      {/* Contact channels */}
      <h2 className={s.sectionTitle}>
        <Headphones
          size={16}
          strokeWidth={1.75}
          aria-hidden
          style={{ color: 'var(--ds-brand-600)' }}
        />
        راه‌های ارتباط با ما
        <span className={s.sectionKicker}>پاسخ سریع</span>
      </h2>

      <div className={s.contact}>
        {phone && (
          <a href={`tel:${phone}`} className={s.channel} dir="ltr">
            <span className={s.channelIcon} aria-hidden>
              <Phone size={20} strokeWidth={1.75} />
            </span>
            <span className={s.channelBody}>
              <span className={s.channelLabel}>تلفن پشتیبانی</span>
              <span className={s.channelValue}>{phone}</span>
              <span className={s.channelSub}>پاسخگویی فوری</span>
            </span>
          </a>
        )}

        {email && (
          <a href={`mailto:${email}`} className={s.channel}>
            <span className={s.channelIcon} aria-hidden>
              <Mail size={20} strokeWidth={1.75} />
            </span>
            <span className={s.channelBody}>
              <span className={s.channelLabel}>ایمیل پشتیبانی</span>
              <span className={s.channelValue}>{email}</span>
              <span className={s.channelSub}>پاسخ تا ۲۴ ساعت</span>
            </span>
          </a>
        )}

        <Link href="/contact" className={s.channel}>
          <span className={s.channelIcon} aria-hidden>
            <MessageCircle size={20} strokeWidth={1.75} />
          </span>
          <span className={s.channelBody}>
            <span className={s.channelLabel}>چت آنلاین</span>
            <span className={s.channelValue}>گفتگوی زنده</span>
            <span className={s.channelSub}>۲۴ ساعته</span>
          </span>
        </Link>

        <Link href="/dashboard/my-requests" className={s.channel}>
          <span className={s.channelIcon} aria-hidden>
            <CircleHelp size={20} strokeWidth={1.75} />
          </span>
          <span className={s.channelBody}>
            <span className={s.channelLabel}>درخواست‌های من</span>
            <span className={s.channelValue}>پیگیری لحظه‌ای</span>
            <span className={s.channelSub}>از داشبورد کاربری</span>
          </span>
        </Link>
      </div>
    </>
  );
}
