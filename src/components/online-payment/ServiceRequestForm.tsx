'use client';

import { type FC, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTelegram, FaWhatsapp } from 'react-icons/fa';
import {
  HiUser,
  HiPhone,
  HiMail,
  HiCurrencyDollar,
  HiDocumentText,
  HiLightningBolt,
  HiCheckCircle,
  HiExclamationCircle,
  HiClipboardCopy,
  HiGlobe,
  HiOfficeBuilding,
} from 'react-icons/hi';
import { ServiceRequestSchema, type ServiceRequestFormData } from '@/schemas';
import { createServiceRequest, type ServiceRequestInput } from '@/actions/serviceRequestActions';

const serviceTypes = [
  { value: 'INTERNATIONAL_TRANSFER', label: 'حواله بین‌المللی', icon: '🌍' },
  { value: 'ONLINE_PAYMENT', label: 'پرداخت آنلاین', icon: '💳' },
  { value: 'TUITION_PAYMENT', label: 'پرداخت شهریه', icon: '🎓' },
  { value: 'FREELANCE_INCOME', label: 'نقد کردن درآمد فریلنسری', icon: '💼' },
  { value: 'SOFTWARE_PURCHASE', label: 'خرید نرم‌افزار/اشتراک', icon: '📦' },
  { value: 'OTHER', label: 'سایر خدمات', icon: '✨' },
] as const;

const currencies = [
  { value: 'USD', label: 'دلار آمریکا', symbol: '$', flag: '🇺🇸' },
  { value: 'EUR', label: 'یورو', symbol: '€', flag: '🇪🇺' },
  { value: 'GBP', label: 'پوند انگلیس', symbol: '£', flag: '🇬🇧' },
  { value: 'TRY', label: 'لیر ترکیه', symbol: '₺', flag: '🇹🇷' },
  { value: 'AED', label: 'درهم امارات', symbol: 'د.إ', flag: '🇦🇪' },
  { value: 'CAD', label: 'دلار کانادا', symbol: 'C$', flag: '🇨🇦' },
  { value: 'AUD', label: 'دلار استرالیا', symbol: 'A$', flag: '🇦🇺' },
  { value: 'CHF', label: 'فرانک سوئیس', symbol: 'CHF', flag: '🇨🇭' },
  { value: 'CNY', label: 'یوان چین', symbol: '¥', flag: '🇨🇳' },
  { value: 'JPY', label: 'ین ژاپن', symbol: '¥', flag: '🇯🇵' },
  { value: 'USDT', label: 'تتر (USDT)', symbol: '₮', flag: '💎' },
  { value: 'OTHER', label: 'سایر ارزها', symbol: '?', flag: '🌐' },
] as const;

const countries = [
  'ترکیه', 'امارات', 'آلمان', 'انگلستان', 'کانادا', 'استرالیا',
  'آمریکا', 'فرانسه', 'سوئیس', 'هلند', 'چین', 'ژاپن', 'سایر',
];

interface ServiceRequestFormProps {
  defaultServiceType?: ServiceRequestFormData['serviceType'];
  telegramLink?: string | null;
  whatsappLink?: string | null;
}

// Helper to extract username/number from link
function extractContact(link: string | null | undefined, type: 'telegram' | 'whatsapp'): string {
  if (!link) return '';
  if (type === 'telegram') {
    // Handle t.me/username or @username or just username
    const match = link.match(/(?:t\.me\/|@)?(\w+)/);
    return match ? match[1] : link;
  }
  // WhatsApp - extract number
  const match = link.match(/[\d+]+/);
  return match ? match[0].replace(/\D/g, '') : '';
}

const ServiceRequestForm: FC<ServiceRequestFormProps> = ({
  defaultServiceType = 'ONLINE_PAYMENT',
  telegramLink,
  whatsappLink,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message?: string;
    trackingCode?: string;
  }>({ status: 'idle' });
  const [copiedCode, setCopiedCode] = useState(false);

  // Determine available contact methods
  const hasTelegram = Boolean(telegramLink);
  const hasWhatsapp = Boolean(whatsappLink);
  const defaultContact = hasTelegram ? 'telegram' : hasWhatsapp ? 'whatsapp' : 'telegram';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<ServiceRequestFormData>({
    resolver: zodResolver(ServiceRequestSchema),
    defaultValues: {
      serviceType: defaultServiceType,
      currency: 'USD',
      urgency: 'NORMAL',
      contactMethod: defaultContact,
    },
  });

  const contactMethod = watch('contactMethod');
  const serviceType = watch('serviceType');
  const selectedCurrency = watch('currency');

  const copyTrackingCode = useCallback(async () => {
    if (submitResult.trackingCode) {
      await navigator.clipboard.writeText(submitResult.trackingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }, [submitResult.trackingCode]);

  const generateMessage = (data: ServiceRequestFormData, trackingCode: string): string => {
    const serviceLabel = serviceTypes.find((s) => s.value === data.serviceType)?.label || data.serviceType;
    const currencyInfo = currencies.find((c) => c.value === data.currency);
    const urgencyLabel = data.urgency === 'URGENT' ? '🔴 فوری' : '🟢 عادی';

    return `📋 درخواست جدید خدمات
🔖 کد پیگیری: ${trackingCode}

👤 نام: ${data.fullName}
📱 شماره تماس: ${data.phone}
${data.email ? `📧 ایمیل: ${data.email}` : ''}

🏷️ نوع خدمات: ${serviceLabel}
💰 مبلغ: ${data.amount} ${currencyInfo?.label || data.currency}
⏰ اولویت: ${urgencyLabel}
${data.destinationCountry ? `🌍 کشور مقصد: ${data.destinationCountry}` : ''}
${data.bankName ? `🏦 بانک: ${data.bankName}` : ''}
${data.description ? `📝 توضیحات: ${data.description}` : ''}`.trim();
  };

  const onSubmit = async (data: ServiceRequestFormData) => {
    setIsSubmitting(true);
    setSubmitResult({ status: 'idle' });

    try {
      const result = await createServiceRequest(data as ServiceRequestInput);

      if (!result.success) {
        setSubmitResult({ status: 'error', message: result.message, trackingCode: result.trackingCode });
        return;
      }

      const trackingCode = result.trackingCode!;
      const message = generateMessage(data, trackingCode);
      const encodedMessage = encodeURIComponent(message);

      // Build URL from system settings
      let url: string;
      if (data.contactMethod === 'telegram' && telegramLink) {
        const username = extractContact(telegramLink, 'telegram');
        url = `https://t.me/${username}?text=${encodedMessage}`;
      } else if (data.contactMethod === 'whatsapp' && whatsappLink) {
        const number = extractContact(whatsappLink, 'whatsapp');
        url = `https://wa.me/${number}?text=${encodedMessage}`;
      } else {
        // Fallback
        url = data.contactMethod === 'telegram'
          ? `https://t.me/share?text=${encodedMessage}`
          : `https://wa.me/?text=${encodedMessage}`;
      }

      window.open(url, '_blank');
      setSubmitResult({ status: 'success', message: result.message, trackingCode });
      reset();
    } catch {
      setSubmitResult({ status: 'error', message: 'خطایی در ثبت درخواست رخ داد.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTransferService = serviceType === 'INTERNATIONAL_TRANSFER';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Success State */}
      <AnimatePresence mode="wait">
        {submitResult.status === 'success' && submitResult.trackingCode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-8 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-800/50 rounded-full flex items-center justify-center">
                <HiCheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-bold text-green-800 dark:text-green-300">درخواست ثبت شد!</h3>
                <p className="text-sm text-green-600 dark:text-green-400">کد پیگیری خود را ذخیره کنید</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-neutral-800 rounded-xl border-2 border-dashed border-green-300 dark:border-green-700">
              <span className="text-2xl font-mono font-bold text-green-700 dark:text-green-300 flex-1 text-center">
                {submitResult.trackingCode}
              </span>
              <button type="button" onClick={copyTrackingCode} className="p-2 hover:bg-green-100 dark:hover:bg-green-800/50 rounded-lg">
                <HiClipboardCopy className={`w-6 h-6 ${copiedCode ? 'text-green-600' : 'text-neutral-500'}`} />
              </button>
            </div>
            {copiedCode && <p className="text-center text-sm text-green-600 mt-2">کپی شد!</p>}
            <p className="text-sm text-green-700 dark:text-green-400 mt-4 text-center">
              لطفاً در پنجره باز شده پیام را ارسال کنید.
            </p>
            <button
              type="button"
              onClick={() => setSubmitResult({ status: 'idle' })}
              className="w-full mt-4 py-3 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800/30 rounded-xl font-medium"
            >
              ثبت درخواست جدید
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {submitResult.status !== 'success' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Contact Method */}
          {(hasTelegram || hasWhatsapp) && (
            <div className="flex gap-2 p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
              {hasTelegram && (
                <label className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg cursor-pointer transition-all ${
                  contactMethod === 'telegram' ? 'bg-[#0088cc] text-white shadow-lg' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}>
                  <input type="radio" value="telegram" {...register('contactMethod')} className="sr-only" />
                  <FaTelegram className="w-5 h-5" />
                  <span className="font-medium">تلگرام</span>
                </label>
              )}
              {hasWhatsapp && (
                <label className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg cursor-pointer transition-all ${
                  contactMethod === 'whatsapp' ? 'bg-[#25D366] text-white shadow-lg' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}>
                  <input type="radio" value="whatsapp" {...register('contactMethod')} className="sr-only" />
                  <FaWhatsapp className="w-5 h-5" />
                  <span className="font-medium">واتساپ</span>
                </label>
              )}
            </div>
          )}

          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">نوع خدمات *</label>
            <select {...register('serviceType')} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              {serviceTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
              ))}
            </select>
          </div>

          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                <HiUser className="inline w-4 h-4 ml-1" />نام و نام خانوادگی *
              </label>
              <input type="text" {...register('fullName')} className={`w-full px-4 py-3 rounded-xl border ${errors.fullName ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'} bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500`} placeholder="نام کامل" />
              {errors.fullName && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><HiExclamationCircle className="w-4 h-4" />{errors.fullName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                <HiPhone className="inline w-4 h-4 ml-1" />شماره تماس *
              </label>
              <input type="tel" dir="ltr" {...register('phone')} className={`w-full px-4 py-3 rounded-xl border ${errors.phone ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'} bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500`} placeholder="09123456789" />
              {errors.phone && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><HiExclamationCircle className="w-4 h-4" />{errors.phone.message}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              <HiMail className="inline w-4 h-4 ml-1" />ایمیل (اختیاری)
            </label>
            <input type="email" dir="ltr" {...register('email')} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="example@email.com" />
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                <HiCurrencyDollar className="inline w-4 h-4 ml-1" />مبلغ *
              </label>
              <input type="text" dir="ltr" {...register('amount')} className={`w-full px-4 py-3 rounded-xl border ${errors.amount ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'} bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500`} placeholder="500" />
              {errors.amount && <p className="mt-1 text-sm text-red-500">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">واحد ارز *</label>
              <select {...register('currency')} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                {currencies.map((c) => <option key={c.value} value={c.value}>{c.flag} {c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Transfer fields */}
          <AnimatePresence>
            {isTransferService && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-hidden">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    <HiGlobe className="inline w-4 h-4 ml-1" />کشور مقصد
                  </label>
                  <select {...register('destinationCountry')} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">انتخاب کنید...</option>
                    {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    <HiOfficeBuilding className="inline w-4 h-4 ml-1" />نام بانک مقصد
                  </label>
                  <input type="text" {...register('bankName')} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Deutsche Bank" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              <HiLightningBolt className="inline w-4 h-4 ml-1" />اولویت
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="NORMAL" {...register('urgency')} className="w-4 h-4 text-primary-600" />
                <span className="text-neutral-700 dark:text-neutral-300">🟢 عادی</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="URGENT" {...register('urgency')} className="w-4 h-4 text-red-600" />
                <span className="text-neutral-700 dark:text-neutral-300">🔴 فوری</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              <HiDocumentText className="inline w-4 h-4 ml-1" />توضیحات (اختیاری)
            </label>
            <textarea {...register('description')} rows={3} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" placeholder="توضیحات بیشتر..." />
          </div>

          {/* Error */}
          <AnimatePresence>
            {submitResult.status === 'error' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-2">
                <HiExclamationCircle className="w-5 h-5" />
                <span>{submitResult.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={isSubmitting || (!hasTelegram && !hasWhatsapp)}
            className={`w-full py-4 px-6 rounded-xl font-semibold text-white flex items-center justify-center gap-3 transition-all ${
              contactMethod === 'telegram' ? 'bg-[#0088cc] hover:bg-[#0077b5] shadow-lg shadow-[#0088cc]/30' : 'bg-[#25D366] hover:bg-[#20bd5a] shadow-lg shadow-[#25D366]/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
            whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
          >
            {isSubmitting ? (
              <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />در حال ثبت...</>
            ) : (
              <>{contactMethod === 'telegram' ? <FaTelegram className="w-5 h-5" /> : <FaWhatsapp className="w-5 h-5" />}ثبت و ارسال به {contactMethod === 'telegram' ? 'تلگرام' : 'واتساپ'}</>
            )}
          </motion.button>

          {!hasTelegram && !hasWhatsapp && (
            <p className="text-center text-sm text-red-500">لینک‌های پشتیبانی تنظیم نشده‌اند. لطفاً با مدیر سایت تماس بگیرید.</p>
          )}

          <p className="text-center text-xs text-neutral-500">🔒 اطلاعات شما محفوظ است • کد پیگیری برای شما ارسال می‌شود</p>
        </form>
      )}
    </motion.div>
  );
};

export default ServiceRequestForm;
