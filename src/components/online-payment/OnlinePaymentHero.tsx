import type { FC } from 'react';
import Image from 'next/image';
import * as motion from 'framer-motion/client';

const OnlinePaymentHero: FC = () => {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-100 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900 overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between">
        <motion.div
          className="lg:w-1/2 text-center lg:text-left mb-12 lg:mb-0"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
            پرداخت‌های بین‌المللی <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              آسان و سریع
            </span>
          </h1>
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-10 max-w-2xl mx-auto lg:mx-0">
            خدمات پرداخت بین‌المللی شما از طریق پی‌پال، مستر کارت، ویزا کارت، حساب بانکی و سایر روش‌های
            آنلاین با بهترین شرایط و قیمت‌ها.
          </p>
          <motion.button
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full text-lg shadow-lg hover:shadow-xl transition duration-300 transform hover:scale-105"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            شروع کنید
          </motion.button>
        </motion.div>
        <motion.div
          className="lg:w-1/2"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Image
            src="/images/online-payment-hero.svg"
            alt="تصویر پرداخت آنلاین"
            width={600}
            height={400}
            className="mx-auto"
          />
        </motion.div>
      </div>
      <div className="mt-16 flex justify-center space-x-8 rtl:space-x-reverse">
        {['PayPal', 'Mastercard', 'Visa', 'Bank Transfer'].map((method, index) => (
          <motion.div
            key={method}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
          >
            <Image
              src={`/images/${method.toLowerCase()}-logo.svg`}
              alt={`${method} logo`}
              width={80}
              height={40}
              className="opacity-70 hover:opacity-100 transition-opacity duration-300"
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default OnlinePaymentHero;
