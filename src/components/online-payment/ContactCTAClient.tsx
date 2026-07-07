'use client';

import { type FC, useState } from 'react';
import { motion } from '@/lib/motion-shim';
import { HiClock, HiShieldCheck, HiSupport, HiSearch, HiPencilAlt, HiTrendingUp, HiUsers, HiCheckCircle } from 'react-icons/hi';
import ServiceRequestForm from './ServiceRequestForm';
import TrackingForm from './TrackingForm';

const features = [
  { icon: HiClock, title: 'پاسخگویی سریع', description: 'حداکثر ۳۰ دقیقه', color: 'text-emerald-500' },
  { icon: HiShieldCheck, title: 'تراکنش امن', description: 'با ضمانت بازگشت وجه', color: 'text-blue-500' },
  { icon: HiSupport, title: 'پشتیبانی ۲۴/۷', description: 'همه روزه در خدمت شما', color: 'text-purple-500' },
];

const stats = [
  { icon: HiTrendingUp, value: '۲,۵۰۰+', label: 'تراکنش موفق ماهانه' },
  { icon: HiUsers, value: '۱۲,۰۰۰+', label: 'مشتری راضی' },
  { icon: HiCheckCircle, value: '۹۸٪', label: 'نرخ رضایت' },
];

interface ContactCTAClientProps {
  defaultServiceType?:
    | 'INTERNATIONAL_TRANSFER'
    | 'ONLINE_PAYMENT'
    | 'TUITION_PAYMENT'
    | 'FREELANCE_INCOME'
    | 'SOFTWARE_PURCHASE'
    | 'OTHER';
  telegramLink: string | null;
  whatsappLink: string | null;
}

const ContactCTAClient: FC<ContactCTAClientProps> = ({
  defaultServiceType = 'ONLINE_PAYMENT',
  telegramLink,
  whatsappLink,
}) => {
  const [activeTab, setActiveTab] = useState<'request' | 'tracking'>('request');

  return (
    <section id="contact" className="relative py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Value Proposition Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-full border border-primary-100 dark:border-primary-900/50">
            <HiTrendingUp className="w-4 h-4" />
            بیش از ۲,۵۰۰ تراکنش موفق در ماه
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-white mb-4 leading-tight">
            درخواست خود را <span className="text-primary-600 dark:text-primary-400">آنلاین</span> ثبت کنید
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-lg max-w-2xl mx-auto leading-relaxed">
            فرم زیر را پر کنید تا کارشناسان ما در کمتر از ۳۰ دقیقه با شما تماس بگیرند
          </p>
        </motion.div>

        {/* Social Proof Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12"
        >
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="flex items-center gap-4 p-4 bg-white dark:bg-neutral-800/50 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50"
            >
              <div className="p-3 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
                <stat.icon className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white">{stat.value}</div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">{stat.label}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 p-5 sm:p-8 lg:p-10 shadow-xl border border-neutral-200/50 dark:border-neutral-700/50"
        >
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

          <div className="relative">
            {/* Tab Switcher */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex p-1.5 bg-neutral-200/50 dark:bg-neutral-700/50 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('request')}
                  className={`flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === 'request'
                      ? 'bg-white dark:bg-neutral-800 text-primary-600 dark:text-primary-400 shadow-lg shadow-primary-500/10'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <HiPencilAlt className="w-5 h-5" />
                  ثبت درخواست
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('tracking')}
                  className={`flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === 'tracking'
                      ? 'bg-white dark:bg-neutral-800 text-primary-600 dark:text-primary-400 shadow-lg shadow-primary-500/10'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <HiSearch className="w-5 h-5" />
                  پیگیری درخواست
                </button>
              </div>
            </div>

            {activeTab === 'request' ? (
              <>
                {/* Features Section */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50 hover:shadow-md transition-shadow duration-300"
                    >
                      <div className={`p-3 rounded-xl bg-neutral-100 dark:bg-neutral-700/50 ${feature.color}`}>
                        <feature.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white block">{feature.title}</span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{feature.description}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <ServiceRequestForm
                  defaultServiceType={defaultServiceType}
                  telegramLink={telegramLink}
                  whatsappLink={whatsappLink}
                />
              </>
            ) : (
              <>
                <div className="text-center mb-10">
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-block px-4 py-1.5 mb-4 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-full"
                  >
                    پیگیری سفارش
                  </motion.span>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white mb-3 leading-snug">
                    پیگیری درخواست
                  </h2>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                    کد پیگیری خود را وارد کنید تا وضعیت درخواست را مشاهده کنید
                  </p>
                </div>
                <TrackingForm />
              </>
            )}
          </div>
        </motion.div>

        {/* Urgency Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl shadow-lg shadow-primary-500/25">
            <HiClock className="w-5 h-5" />
            <span className="font-medium">پاسخگویی در کمتر از ۳۰ دقیقه</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactCTAClient;
