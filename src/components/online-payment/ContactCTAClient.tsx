'use client';

import { type FC, useState } from 'react';
import { motion } from 'framer-motion';
import { HiClock, HiShieldCheck, HiSupport, HiSearch, HiPencilAlt } from 'react-icons/hi';
import ServiceRequestForm from './ServiceRequestForm';
import TrackingForm from './TrackingForm';

const features = [
  { icon: HiClock, title: 'پاسخگویی سریع', description: 'حداکثر ۳۰ دقیقه' },
  { icon: HiShieldCheck, title: 'تراکنش امن', description: 'با ضمانت بازگشت وجه' },
  { icon: HiSupport, title: 'پشتیبانی ۲۴/۷', description: 'همه روزه در خدمت شما' },
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
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 p-6 sm:p-10 lg:p-12 shadow-xl border border-neutral-200/50 dark:border-neutral-700/50"
        >
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

          <div className="relative">
            {/* Tab Switcher */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex p-1 bg-neutral-200/50 dark:bg-neutral-700/50 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('request')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === 'request'
                      ? 'bg-white dark:bg-neutral-800 text-primary-600 dark:text-primary-400 shadow-md'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <HiPencilAlt className="w-5 h-5" />
                  ثبت درخواست
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('tracking')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === 'tracking'
                      ? 'bg-white dark:bg-neutral-800 text-primary-600 dark:text-primary-400 shadow-md'
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
                <div className="text-center mb-10">
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="inline-block px-4 py-1.5 mb-4 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-full"
                  >
                    فرم درخواست خدمات
                  </motion.span>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
                    ثبت درخواست آنلاین
                  </h2>
                  <p className="text-neutral-600 dark:text-neutral-400 text-lg max-w-xl mx-auto">
                    فرم زیر را پر کنید تا درخواست شما مستقیماً به کارشناسان ما ارسال شود
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      className="flex flex-col items-center p-4 rounded-xl bg-white dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50"
                    >
                      <feature.icon className="w-8 h-8 text-primary-500 mb-2" />
                      <span className="font-medium text-neutral-900 dark:text-white">{feature.title}</span>
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">{feature.description}</span>
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
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
                    پیگیری درخواست
                  </h2>
                  <p className="text-neutral-600 dark:text-neutral-400 text-lg max-w-xl mx-auto">
                    کد پیگیری خود را وارد کنید تا وضعیت درخواست را مشاهده کنید
                  </p>
                </div>
                <TrackingForm />
              </>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactCTAClient;
