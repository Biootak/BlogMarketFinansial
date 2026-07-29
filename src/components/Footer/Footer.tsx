'use client';

import BannerAds from '@/components/BannerADS/BannerADS';
import Logo from '@/components/Logo/Logo';
import SocialLinks from '@/components/SocialsList/SocialLinks';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { heading, radius, space, text } from '@/lib/design-tokens';
import { motion } from '@/lib/motion-shim';
import type { Advertisement } from '@/types/types';
import {
  ArrowUpLeft,
  Building2,
  Coins,
  Headphones,
  Mail,
  MapPin,
  Phone,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import s from './Footer.module.css';

interface WidgetFooterMenu {
  id: string;
  title: string;
  icon: React.ReactNode;
  menus: { href: string; label: string }[];
}

const widgetMenus: WidgetFooterMenu[] = [
  {
    id: 'services',
    title: 'خدمات فین‌تک',
    icon: <Wallet size={14} aria-hidden />,
    menus: [
      { href: '/wallet', label: 'کیف پول دیجیتال' },
      { href: '/kyc', label: 'احراز هویت' },
      { href: '/beneficiaries', label: 'مخاطبان انتقال' },
      { href: '/money-transfer', label: 'حواله ارزی' },
      { href: '/online-payment', label: 'پرداخت آنلاین' },
    ],
  },
  {
    id: 'exchanges',
    title: 'صرافی‌ها',
    icon: <Building2 size={14} aria-hidden />,
    menus: [
      { href: '/exchanges', label: 'همه صرافی‌ها' },
      { href: '/exchange-rates', label: 'نرخ لحظه‌ای' },
      { href: '/services', label: 'مقایسه خدمات' },
      { href: '/apply-exchange', label: 'ثبت‌نام صرافی' },
    ],
  },
  {
    id: 'archive',
    title: 'آرشیو و محتوا',
    icon: <Coins size={14} aria-hidden />,
    menus: [
      { href: '/archive', label: 'آرشیو مقالات' },
      { href: '/categories', label: 'دسته‌بندی‌ها' },
      { href: '/tags', label: 'برچسب‌ها' },
      { href: '/authors', label: 'نویسندگان' },
      { href: '/blog', label: 'بلاگ' },
    ],
  },
  {
    id: 'company',
    title: 'شرکت',
    icon: <Headphones size={14} aria-hidden />,
    menus: [
      { href: '/about', label: 'درباره ما' },
      { href: '/contact', label: 'تماس با ما' },
      { href: '/help-center', label: 'مرکز راهنما' },
      { href: '/faq', label: 'پرسش‌های متداول' },
      { href: '/support', label: 'پشتیبانی' },
      { href: '/feedback', label: 'بازخورد' },
    ],
  },
];

interface FooterProps {
  footerAd?: Advertisement | null;
  siteName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
}

const Footer = ({
  footerAd,
  siteName = 'Financial Market',
  contactEmail,
  contactPhone,
  contactAddress,
}: FooterProps) => {
  const { logoUrl } = useSiteSettings();

  // Normalize Persian phone for display (e.g. 09380929606)
  const displayPhone = contactPhone?.trim() || '۰۹۳۸۰۹۲۶۰۶';
  const displayEmail = contactEmail?.trim() || 'support@financialmarket.com';

  return (
    <footer className="relative overflow-hidden">
      {/* R18-fix (2026-07-29): لایه‌های پس‌زمینه به design tokens مهاجرت کردند. */}
      <div className={`${s.bg} dark:${s.bgDark}`} aria-hidden />
      <div className={`${s.glow} dark:${s.glowDark}`} aria-hidden />
      <div className={s.orb1} aria-hidden />
      <div className={s.orb2} aria-hidden />
      <div className={`${s.hairline} dark:${s.hairlineDark}`} aria-hidden />

      {footerAd && (
        <div className="relative z-10 pt-10 pb-2">
          <div className="container max-w-4xl">
            <div className="relative group rounded-3xl overflow-hidden shadow-lg hover:shadow-[0_20px_50px_-10px_var(--ds-accent-violet)] transition-all duration-500 border border-slate-200/40 dark:border-neutral-800/80 bg-white/30 dark:bg-neutral-900/30 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/5 via-transparent to-violet-500/5 opacity-40 pointer-events-none" />
              <div className="absolute inset-0 border border-primary-500/0 group-hover:border-primary-500/20 rounded-3xl transition-colors duration-500 pointer-events-none" />
              <BannerAds
                ad={footerAd}
                variant="rich"
                className="!border-0 !bg-transparent !shadow-none !backdrop-blur-none"
              />
            </div>
          </div>
        </div>
      )}

      <div className="container relative z-10 pt-10 pb-8">
        {/* Social Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-16"
        >
          <div
            className={[
              'inline-flex items-center gap-2 px-4 py-2 mb-6',
              radius.pill,
              'bg-white/60 dark:bg-white/5 backdrop-blur-sm',
              'border border-slate-200/50 dark:border-slate-700/50',
            ].join(' ')}
          >
            <span className="relative flex items-center justify-center w-2 h-2" aria-hidden>
              <span className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500/60 animate-ping" />
              <span className="relative w-2 h-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              همیشه در دسترس
            </span>
          </div>
          <h3 className={['mb-6', heading.h2].join(' ')}>ما را در شبکه‌های اجتماعی دنبال کنید</h3>
          <SocialLinks className="flex justify-center gap-3" />
        </motion.div>

        {/* Main Grid */}
        <div
          className={[
            'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-16',
            space.gapLg,
          ].join(' ')}
        >
          {/* Brand Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="col-span-2 md:col-span-3 lg:col-span-1"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-primary-500/20 to-indigo-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />
                  <Logo logoUrl={logoUrl || undefined} className="relative w-14 h-auto" />
                </div>
                <div>
                  <h2 className={heading.h2}>{siteName}</h2>
                  <p className={text.bodySm}>بازارهای مالی</p>
                </div>
              </div>
              <p className={text.bodySm}>
                ارائه بهترین خدمات ارز دیجیتال و بازارهای مالی با امنیت و سرعت بالا. ما با استفاده
                از فناوری‌های پیشرفته، بهترین تجربه معاملاتی را برای شما فراهم می‌کنیم.
              </p>
            </div>
          </motion.div>

          {/* Menu Columns */}
          {widgetMenus.map((menu, index) => (
            <motion.div
              key={menu.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: (index + 1) * 0.08 }}
            >
              <h3
                className={[
                  heading.h5,
                  'mb-5 flex items-center gap-2 text-slate-800 dark:text-slate-100',
                ].join(' ')}
              >
                <span
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400"
                  aria-hidden
                >
                  {menu.icon}
                </span>
                {menu.title}
              </h3>
              <ul className={space.stackMd}>
                {menu.menus.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        'group inline-flex items-center gap-2',
                        'text-neutral-600 dark:text-neutral-400',
                        'hover:text-primary-600 dark:hover:text-primary-400',
                        'transition-colors duration-200',
                      ].join(' ')}
                    >
                      <ArrowUpLeft
                        className="size-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
                        aria-hidden
                      />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Contact Bar — 3-column with icons */}
        <div className={s.contactBar}>
          <a
            href={`tel:${displayPhone.replace(/[^0-9+]/g, '')}`}
            className={s.contactCard}
            aria-label={`تماس تلفنی: ${displayPhone}`}
          >
            <span className={s.contactIcon} aria-hidden>
              <Phone size={18} strokeWidth={1.9} />
            </span>
            <div className={s.contactText}>
              <p className={s.contactLabel}>پشتیبانی تلفنی</p>
              <p className={s.contactValue} dir="ltr">
                {displayPhone}
              </p>
            </div>
          </a>
          <a
            href={`mailto:${displayEmail}`}
            className={s.contactCard}
            aria-label={`ایمیل: ${displayEmail}`}
          >
            <span className={s.contactIcon} aria-hidden>
              <Mail size={18} strokeWidth={1.9} />
            </span>
            <div className={s.contactText}>
              <p className={s.contactLabel}>ایمیل پشتیبانی</p>
              <p className={s.contactValue} dir="ltr">
                {displayEmail}
              </p>
            </div>
          </a>
          {contactAddress?.trim() && (
            <div className={s.contactCard}>
              <span className={s.contactIcon} aria-hidden>
                <MapPin size={18} strokeWidth={1.9} />
              </span>
              <div className={s.contactText}>
                <p className={s.contactLabel}>دفتر مرکزی</p>
                <p className={s.contactValue}>{contactAddress}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="relative"
        >
          <div className={`${s.hairline} ${s.hairlineDark}`} />

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-500">
              <span dir="rtl">تمامی حقوق محفوظ است.</span>{' '}
              <span className="text-slate-700 dark:text-slate-400 font-medium">{siteName}</span>{' '}
              <span dir="ltr">© 2026</span>
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/terms"
                className="text-sm text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
              >
                قوانین و مقررات
              </Link>
              <Link
                href="/privacy-policy"
                className="text-sm text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
              >
                حریم خصوصی
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
