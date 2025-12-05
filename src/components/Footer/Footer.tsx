import Link from 'next/link';
import * as motion from 'framer-motion/client';
import SocialLinks from '@/components/SocialsList/SocialLinks';
import Logo from '@/components/Logo/Logo';
import { getSystemSettingsData } from '@/data/getSystemSettings';
import { Mail, Phone, MapPin, ArrowUpLeft } from 'lucide-react';

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
    ],
  },
];

const Footer = async () => {
  const settings = await getSystemSettingsData();
  const siteName = settings.siteName || 'بیوتاک';

  return (
    <footer className="relative overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neutral-900 dark:via-neutral-950 dark:to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.15),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.1),transparent)]" />
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      
      {/* Top border gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />

      <div className="container relative z-10 pt-20 pb-8">
        {/* Social Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">همیشه در دسترس</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
            ما را در شبکه‌های اجتماعی دنبال کنید
          </h3>
          <SocialLinks className="flex justify-center gap-3" />
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4 mb-16">
          {/* Brand Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-1"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-primary-500/20 to-indigo-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />
                  <Logo className="relative w-14 h-auto" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{siteName}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">بازارهای مالی</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                ارائه بهترین خدمات ارز دیجیتال و بازارهای مالی با امنیت و سرعت بالا. ما با استفاده از
                فناوری‌های پیشرفته، بهترین تجربه معاملاتی را برای شما فراهم می‌کنیم.
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
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-6">
                {menu.title}
              </h3>
              <ul className="space-y-3">
                {menu.menus.map((item, itemIndex) => (
                  <motion.li
                    key={itemIndex}
                    whileHover={{ x: -4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <Link
                      href={item.href}
                      className="group inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
                    >
                      <ArrowUpLeft className="size-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                      <span>{item.label}</span>
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
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-6">
              مسیر ارتباطی
            </h3>
            <ul className="space-y-4">
              <li>
                <a
                  href="tel:09380929606"
                  className="group flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
                >
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/10 to-indigo-500/10 dark:from-primary-500/20 dark:to-indigo-500/20 group-hover:from-primary-500/20 group-hover:to-indigo-500/20 transition-all duration-300">
                    <Phone className="size-4 text-primary-600 dark:text-primary-400" />
                  </span>
                  <span className="text-sm font-medium" dir="ltr">۰۹۳۸۰۹۲۹۶۰۶</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@financialmarket.com"
                  className="group flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
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
          {/* Separator */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
          
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-500">
              <span dir="rtl">تمامی حقوق محفوظ است.</span>{' '}
              <span className="text-slate-700 dark:text-slate-400 font-medium">{siteName}</span>{' '}
              <span dir="ltr">© {new Date().getFullYear()}</span>
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/terms"
                className="text-sm text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
              >
                قوانین و مقررات
              </Link>
              <Link
                href="/privacy"
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
