import type React from 'react';
import Link from 'next/link';
import * as motion from 'framer-motion/client';
import SocialsList from '@/components/SocialsList/SocialsList';
import { SOCIALS_DATA } from '@/components/SocialsShare/SocialsShare';
import Logo from '@/components/Logo/Logo';

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

const Footer: React.FC = () => {
  return (
    <footer className="relative py-20 overflow-hidden bg-gradient-to-b from-indigo-100 to-purple-100 dark:from-gray-900 dark:to-indigo-900">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0))]" />
      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ما را در شبکه‌های اجتماعی دنبال کنید
          </h3>
          <SocialsList
            className="flex justify-center gap-4"
            socials={SOCIALS_DATA}
          />
        </motion.div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <Logo className="w-20 h-auto" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white"> Financial Market</h2>
            <p className="text-base text-gray-600 dark:text-gray-300">
              ارائه بهترین خدمات ارز دیجیتال و بازارهای مالی با امنیت و سرعت بالا. ما با استفاده از
              فناوری‌های پیشرفته و تیم متخصص، بهترین تجربه معاملاتی را برای شما فراهم می‌کنیم.
            </p>
          </motion.div>

          {widgetMenus.map((menu, index) => (
            <motion.div
              key={menu.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{menu.title}</h3>
              <ul className="space-y-4">
                {menu.menus.map((item, itemIndex) => (
                  <motion.li
                    key={itemIndex}
                    whileHover={{ x: 5 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  >
                    <Link
                      href={item.href}
                      className="text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-colors"
                    >
                      {item.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">مسیر ارتباطی</h3>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-indigo-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                  <title>خرید و فروش ترون</title>
                </svg>
                <span className="text-gray-600 dark:text-gray-300">۰۹۳۸۰۹۲۹۶۰۶</span>
              </li>
              <li className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-indigo-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                  <title>تماس با ما</title>
                </svg>
                <span className="text-gray-600 dark:text-gray-300">
                  support@financialmarket.com
                </span>
              </li>
            </ul>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700 text-center"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            <span dir="rtl">تمامی حقوق محفوظ است.</span> <span dir="ltr">© Financial Market</span>
          </p>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
