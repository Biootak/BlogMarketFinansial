'use client';

import BannerAds from '@/components/BannerADS/BannerADS';
import Logo from '@/components/Logo/Logo';
import SocialLinks from '@/components/SocialsList/SocialLinks';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { heading, radius, space, text } from '@/lib/design-tokens';
import { motion } from '@/lib/motion-shim';
import type { Advertisement } from '@/types/types';
import { ArrowUpLeft, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

interface WidgetFooterMenu {
  id: string;
  title: string;
  menus: { href: string; label: string }[];
}

const widgetMenus: WidgetFooterMenu[] = [
  {
    id: 'useful-links',
    title: 'لینک‌های مفید',
    menus: [
      { href: '/archive/category/crypto', label: 'ارز های دیجیتال' },
      { href: '/terms', label: 'قوانین و مقررات' },
      { href: '/money-transfer', label: 'حواله ارزها' },
      { href: '/online-payment', label: 'پرداخت آنلاین' },
    ],
  },
  {
    id: 'company',
    title: 'شرکت',
    menus: [
      { href: '/archive', label: 'آرشیو اخبار' },
      { href: '/about', label: 'درباره ما' },
      { href: '/contact', label: 'تماس با ما' },
      { href: '/help-center', label: 'مرکز راهنما' },
      { href: '/faq', label: 'پرسش‌های متداول' },
    ],
  },
];

interface FooterProps {
  footerAd?: Advertisement | null;
  siteName?: string;
}

const Footer = ({ footerAd, siteName = 'Financila Market' }: FooterProps) => {
  const { logoUrl } = useSiteSettings();

  return (
    <footer className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neutral-900 dark:via-neutral-950 dark:to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.15),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.1),transparent)]" />
      <div className="absolute top-0 start-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 end-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />

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
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
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
            'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 mb-16',
            space.gapLg,
          ].join(' ')}
        >
          {/* Brand Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="sm:col-span-2 md:col-span-2 lg:col-span-1"
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
              transition={{ duration: 0.5, delay: (index + 1) * 0.1 }}
            >
              <h3 className={[heading.h5, 'mb-6'].join(' ')}>{menu.title}</h3>
              <ul className={space.stackMd}>
                {menu.menus.map((item) => (
                  <motion.li
                    key={item.href}
                    whileHover={{ x: -4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <Link
                      href={item.href}
                      className={[
                        'group inline-flex items-center gap-2',
                        'text-neutral-600 dark:text-neutral-400',
                        'hover:text-primary-600 dark:hover:text-primary-400',
                        'transition-colors duration-200',
                      ].join(' ')}
                    >
                      <ArrowUpLeft className="size-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}

          {/* Contact Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3 className={[heading.h5, 'mb-6'].join(' ')}>مسیر ارتباطی</h3>
            <ul className={space.stackMd}>
              <li>
                <a
                  href="tel:09380929606"
                  className={[
                    'group flex items-center gap-3',
                    'text-neutral-600 dark:text-neutral-400',
                    'hover:text-primary-600 dark:hover:text-primary-400',
                    'transition-colors duration-200',
                  ].join(' ')}
                >
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/10 to-indigo-500/10 dark:from-primary-500/20 dark:to-indigo-500/20 group-hover:from-primary-500/20 group-hover:to-indigo-500/20 transition-all duration-300">
                    <Phone className="size-4 text-primary-600 dark:text-primary-400" />
                  </span>
                  <span className="text-sm font-medium" dir="ltr">
                    ۰۹۳۸۰۹۲۶۰۶
                  </span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@financialmarket.com"
                  className={[
                    'group flex items-center gap-3',
                    'text-neutral-600 dark:text-neutral-400',
                    'hover:text-primary-600 dark:hover:text-primary-400',
                    'transition-colors duration-200',
                  ].join(' ')}
                >
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/10 to-indigo-500/10 dark:from-primary-500/20 dark:to-indigo-500/20 group-hover:from-primary-500/20 group-hover:to-indigo-500/20 transition-all duration-300">
                    <Mail className="size-4 text-primary-600 dark:text-primary-400" />
                  </span>
                  <span className="text-sm font-medium">support@financialmarket.com</span>
                </a>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="relative"
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />

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
