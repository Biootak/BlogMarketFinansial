'use client';

import type { FC } from 'react';
import { motion } from '@/lib/motion-shim';
import {
  HiGlobe,
  HiCreditCard,
  HiAcademicCap,
  HiCash,
  HiShoppingCart,
  HiSparkles,
} from 'react-icons/hi';

const services = [
  {
    icon: HiGlobe,
    title: 'حواله‌های بین‌المللی',
    description: 'انتقال سریع و امن پول برای افراد و شرکت‌ها به سراسر جهان',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    icon: HiCreditCard,
    title: 'پرداخت‌های آنلاین',
    description: 'خرید آسان از سایت‌های معتبر جهانی با کارت‌های اعتباری',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    icon: HiAcademicCap,
    title: 'خدمات آموزشی',
    description: 'پرداخت شهریه و هزینه‌های ثبت‌نام دانشگاه‌های خارجی',
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: HiCash,
    title: 'نقد کردن درآمد',
    description: 'دریافت درآمد از پلتفرم‌های فریلنسری بین‌المللی',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    icon: HiShoppingCart,
    title: 'خرید نرم‌افزار',
    description: 'تهیه اشتراک و لایسنس برنامه‌های خارجی و سرویس‌های آنلاین',
    color: 'from-rose-500 to-red-500',
    bgColor: 'bg-rose-50 dark:bg-rose-900/20',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  {
    icon: HiSparkles,
    title: 'خدمات ویژه',
    description: 'راه‌حل‌های سفارشی برای نیازهای خاص کسب‌وکار شما',
    color: 'from-indigo-500 to-violet-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
} as const;

const ServicesList: FC = () => {
  return (
    <section
      id="services"
      className="relative py-12 sm:py-14 lg:py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-neutral-900"
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 mb-3 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-full">
            خدمات ما
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-3 leading-snug">
            خدمات پرداخت بین‌المللی
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            با تیم متخصص ما، تمامی نیازهای پرداخت بین‌المللی شما با سرعت و امنیت بالا انجام می‌شود
          </p>
        </motion.div>

        {/* Services Grid */}
        <motion.ul
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {services.map((service) => (
            <motion.li key={service.title} variants={itemVariants}>
              <div className="group h-full p-4 sm:p-5 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-700/50 hover:border-primary-200 dark:hover:border-primary-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-neutral-200/50 dark:hover:shadow-neutral-900/50">
                {/* Icon */}
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${service.bgColor} mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <service.icon className={`w-6 h-6 ${service.iconColor}`} />
                </div>

                {/* Content */}
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300 leading-snug">
                  {service.title}
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {service.description}
                </p>

                {/* Hover indicator */}
                <div
                  className={`mt-6 h-1 w-0 group-hover:w-full rounded-full bg-gradient-to-l ${service.color} transition-all duration-500`}
                />
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
};

export default ServicesList;
