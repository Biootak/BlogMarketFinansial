'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import type { FC } from 'react';
import { HiArrowDown } from 'react-icons/hi';

const paymentMethods = [
  { name: 'PayPal', logo: '/images/paypal.svg' },
  { name: 'Mastercard', logo: '/images/mastercard.svg' },
  { name: 'Visa', logo: '/images/visa.svg' },
  { name: 'Bank Transfer', logo: '/images/banktransfer.svg' },
];

const OnlinePaymentHero: FC = () => {
  const scrollToContact = () => {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background with subtle pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-primary-100/50 dark:from-neutral-900 dark:via-neutral-800 dark:to-primary-900/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-200/30 via-transparent to-transparent dark:from-primary-500/10" />

      <div className="relative max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
          {/* Content */}
          <motion.div
            className="lg:w-1/2 text-center lg:text-right"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium"
            >
              <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
              خدمات فعال و آماده
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-neutral-900 dark:text-white mb-6 leading-tight">
              پرداخت‌های بین‌المللی
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary-600 to-primary-400 dark:from-primary-400 dark:to-primary-300">
                آسان و سریع
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-300 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              خدمات پرداخت بین‌المللی شما از طریق پی‌پال، مستر کارت، ویزا کارت، حساب بانکی و سایر
              روش‌های آنلاین با بهترین شرایط و قیمت‌ها.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <motion.button
                onClick={scrollToContact}
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-lg shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                شروع کنید
                <HiArrowDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
              </motion.button>

              <motion.a
                href="#services"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-600 text-neutral-700 dark:text-neutral-200 font-semibold rounded-xl text-lg transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                مشاهده خدمات
              </motion.a>
            </div>
          </motion.div>

          {/* Hero Image */}
          <motion.div
            className="lg:w-1/2"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          >
            <div className="relative">
              <div className="absolute -top-8 -right-8 w-72 h-72 bg-primary-200/50 dark:bg-primary-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-8 -left-8 w-72 h-72 bg-primary-300/30 dark:bg-primary-600/10 rounded-full blur-3xl" />

              <Image
                src="/images/online-payment-hero.svg"
                alt="تصویر پرداخت آنلاین"
                width={600}
                height={400}
                className="relative mx-auto drop-shadow-2xl"
                priority
              />
            </div>
          </motion.div>
        </div>

        {/* Payment Methods */}
        <motion.div
          className="mt-16 lg:mt-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mb-6">
            روش‌های پرداخت پشتیبانی شده
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12">
            {paymentMethods.map((method, index) => (
              <motion.div
                key={method.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="group"
              >
                <Image
                  src={method.logo}
                  alt={`${method.name} logo`}
                  width={80}
                  height={40}
                  className="opacity-60 group-hover:opacity-100 grayscale group-hover:grayscale-0 transition-all duration-300 dark:invert dark:opacity-50 dark:group-hover:opacity-80"
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default OnlinePaymentHero;
