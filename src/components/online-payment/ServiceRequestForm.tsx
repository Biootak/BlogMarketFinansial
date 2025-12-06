'use client';

import { type ServiceRequestInput, createServiceRequest } from '@/actions/serviceRequestActions';
import { type ServiceRequestFormData, ServiceRequestSchema } from '@/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { type FC, useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FaTelegram, FaWhatsapp } from 'react-icons/fa';
import {
  HiAcademicCap,
  HiArrowLeft,
  HiArrowRight,
  HiCash,
  HiCheckCircle,
  HiClipboardCopy,
  HiClock,
  HiCreditCard,
  HiCurrencyDollar,
  HiDocumentText,
  HiExclamationCircle,
  HiGlobe,
  HiLightningBolt,
  HiMail,
  HiOfficeBuilding,
  HiPhone,
  HiShieldCheck,
  HiShoppingCart,
  HiSparkles,
  HiUser,
} from 'react-icons/hi';

// ============================================
// Types & Constants
// ============================================

type ServiceType = ServiceRequestFormData['serviceType'];

interface ServiceOption {
  value: ServiceType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  bgColor: string;
  gradient: string;
  shadowColor: string;
}

interface CurrencyOption {
  value: string;
  label: string;
  symbol: string;
  flag: string;
  type: 'fiat' | 'crypto';
}

const serviceTypes: ServiceOption[] = [
  {
    value: 'INTERNATIONAL_TRANSFER',
    label: 'حواله بین‌المللی',
    icon: HiGlobe,
    description: 'انتقال پول به حساب بانکی در کشورهای مختلف',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/50',
    gradient: 'from-blue-500/20 via-blue-400/10 to-transparent',
    shadowColor: 'shadow-blue-500/20',
  },
  {
    value: 'ONLINE_PAYMENT',
    label: 'پرداخت آنلاین',
    icon: HiCreditCard,
    description: 'خرید از سایت‌های خارجی با کارت اعتباری',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/50',
    gradient: 'from-purple-500/20 via-purple-400/10 to-transparent',
    shadowColor: 'shadow-purple-500/20',
  },
  {
    value: 'TUITION_PAYMENT',
    label: 'پرداخت شهریه',
    icon: HiAcademicCap,
    description: 'پرداخت هزینه تحصیل در دانشگاه‌های خارجی',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    gradient: 'from-emerald-500/20 via-emerald-400/10 to-transparent',
    shadowColor: 'shadow-emerald-500/20',
  },
  {
    value: 'FREELANCE_INCOME',
    label: 'نقد کردن درآمد',
    icon: HiCash,
    description: 'دریافت درآمد از پلتفرم‌های فریلنسری',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    gradient: 'from-amber-500/20 via-amber-400/10 to-transparent',
    shadowColor: 'shadow-amber-500/20',
  },
  {
    value: 'SOFTWARE_PURCHASE',
    label: 'خرید نرم‌افزار',
    icon: HiShoppingCart,
    description: 'تهیه اشتراک و لایسنس برنامه‌ها',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/50',
    gradient: 'from-rose-500/20 via-rose-400/10 to-transparent',
    shadowColor: 'shadow-rose-500/20',
  },
  {
    value: 'OTHER',
    label: 'سایر خدمات',
    icon: HiSparkles,
    description: 'درخواست‌های خاص و سفارشی',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/50',
    gradient: 'from-indigo-500/20 via-indigo-400/10 to-transparent',
    shadowColor: 'shadow-indigo-500/20',
  },
];

const currencies: CurrencyOption[] = [
  { value: 'USD', label: 'دلار آمریکا', symbol: '$', flag: '🇺🇸', type: 'fiat' },
  { value: 'EUR', label: 'یورو', symbol: '€', flag: '🇪🇺', type: 'fiat' },
  { value: 'GBP', label: 'پوند انگلیس', symbol: '£', flag: '🇬🇧', type: 'fiat' },
  { value: 'TRY', label: 'لیر ترکیه', symbol: '₺', flag: '🇹🇷', type: 'fiat' },
  { value: 'AED', label: 'درهم امارات', symbol: 'د.إ', flag: '🇦🇪', type: 'fiat' },
  { value: 'CAD', label: 'دلار کانادا', symbol: 'C$', flag: '🇨🇦', type: 'fiat' },
  { value: 'AUD', label: 'دلار استرالیا', symbol: 'A$', flag: '🇦🇺', type: 'fiat' },
  { value: 'CHF', label: 'فرانک سوئیس', symbol: 'CHF', flag: '🇨🇭', type: 'fiat' },
  { value: 'CNY', label: 'یوان چین', symbol: '¥', flag: '🇨🇳', type: 'fiat' },
  { value: 'JPY', label: 'ین ژاپن', symbol: '¥', flag: '🇯🇵', type: 'fiat' },
  { value: 'USDT', label: 'تتر (USDT)', symbol: '₮', flag: '💎', type: 'crypto' },
  { value: 'BTC', label: 'بیت‌کوین', symbol: '₿', flag: '🪙', type: 'crypto' },
  { value: 'ETH', label: 'اتریوم', symbol: 'Ξ', flag: '💠', type: 'crypto' },
  { value: 'BNB', label: 'بایننس کوین', symbol: 'BNB', flag: '🔶', type: 'crypto' },
  { value: 'TRX', label: 'ترون', symbol: 'TRX', flag: '🔴', type: 'crypto' },
  { value: 'OTHER', label: 'سایر ارزها', symbol: '?', flag: '🌐', type: 'fiat' },
];

const countries = [
  { value: 'turkey', label: 'ترکیه', flag: '🇹🇷' },
  { value: 'uae', label: 'امارات', flag: '🇦🇪' },
  { value: 'germany', label: 'آلمان', flag: '🇩🇪' },
  { value: 'uk', label: 'انگلستان', flag: '🇬🇧' },
  { value: 'canada', label: 'کانادا', flag: '🇨🇦' },
  { value: 'australia', label: 'استرالیا', flag: '🇦🇺' },
  { value: 'usa', label: 'آمریکا', flag: '🇺🇸' },
  { value: 'france', label: 'فرانسه', flag: '🇫🇷' },
  { value: 'switzerland', label: 'سوئیس', flag: '🇨🇭' },
  { value: 'netherlands', label: 'هلند', flag: '🇳🇱' },
  { value: 'china', label: 'چین', flag: '🇨🇳' },
  { value: 'japan', label: 'ژاپن', flag: '🇯🇵' },
  { value: 'other', label: 'سایر کشورها', flag: '🌍' },
];

// ============================================
// Component Props
// ============================================

interface ServiceRequestFormProps {
  defaultServiceType?: ServiceType;
  telegramLink?: string | null;
  whatsappLink?: string | null;
}

// ============================================
// Main Component
// ============================================

const ServiceRequestForm: FC<ServiceRequestFormProps> = ({
  defaultServiceType = 'ONLINE_PAYMENT',
  telegramLink,
  whatsappLink,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message?: string;
    trackingCode?: string;
  }>({ status: 'idle' });
  const [copiedCode, setCopiedCode] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
    trigger,
  } = useForm<ServiceRequestFormData>({
    resolver: zodResolver(ServiceRequestSchema),
    mode: 'onChange',
    defaultValues: {
      serviceType: defaultServiceType,
      currency: 'USD',
      urgency: 'NORMAL',
      contactMethod: 'telegram',
      fullName: '',
      phone: '',
      email: '',
      amount: '',
      description: '',
      destinationCountry: '',
      bankName: '',
      websiteUrl: '',
      productName: '',
      universityName: '',
      studentId: '',
      platformName: '',
      platformUsername: '',
      softwareName: '',
      subscriptionType: '',
    },
  });

  const serviceType = watch('serviceType');
  const selectedCurrency = watch('currency');
  const amount = watch('amount');
  const fullName = watch('fullName');
  const phone = watch('phone');
  const urgency = watch('urgency');

  const selectedService = useMemo(
    () => serviceTypes.find((s) => s.value === serviceType),
    [serviceType],
  );
  const selectedCurrencyInfo = useMemo(
    () => currencies.find((c) => c.value === selectedCurrency),
    [selectedCurrency],
  );

  const totalSteps = 3;

  const copyTrackingCode = useCallback(async () => {
    if (submitResult.trackingCode) {
      await navigator.clipboard.writeText(submitResult.trackingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }, [submitResult.trackingCode]);

  const nextStep = async () => {
    let fieldsToValidate: (keyof ServiceRequestFormData)[] = [];
    if (currentStep === 1) {
      fieldsToValidate = ['serviceType'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['fullName', 'phone', 'amount', 'currency'];
    }
    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid && currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const onSubmit = async (data: ServiceRequestFormData) => {
    // Only allow submit on final step
    if (currentStep !== totalSteps) {
      return;
    }

    setIsSubmitting(true);
    setSubmitResult({ status: 'idle' });
    try {
      const result = await createServiceRequest(data as ServiceRequestInput);
      if (!result.success) {
        setSubmitResult({
          status: 'error',
          message: result.message,
          trackingCode: result.trackingCode,
        });
        return;
      }
      setSubmitResult({
        status: 'success',
        message: result.message,
        trackingCode: result.trackingCode!,
      });
      reset();
      setCurrentStep(1);
    } catch {
      setSubmitResult({ status: 'error', message: 'خطایی در ثبت درخواست رخ داد.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitResult({ status: 'idle' });
    setCurrentStep(1);
    reset();
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Glassmorphism Container */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        {/* Ambient Background Glow */}
        <div className="absolute -inset-4 bg-gradient-to-r from-primary-500/20 via-purple-500/10 to-blue-500/20 rounded-[2.5rem] blur-3xl opacity-50 dark:opacity-30" />

        {/* Main Card */}
        <div className="relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl rounded-3xl border border-white/50 dark:border-neutral-700/50 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* Decorative Top Border Gradient */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary-500 via-purple-500 to-blue-500" />

          {/* Header Section */}
          <div className="relative px-8 pt-10 pb-8 text-center border-b border-neutral-100 dark:border-neutral-800/50">
            <div className="absolute inset-0 bg-gradient-to-b from-neutral-50/50 to-transparent dark:from-neutral-800/30" />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 text-sm font-medium mb-4 border border-primary-100 dark:border-primary-900/50">
                <HiSparkles className="w-4 h-4" />
                ثبت درخواست جدید
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-3">
                ثبت درخواست آنلاین
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto text-sm sm:text-base">
                فرم زیر را تکمیل کنید تا درخواست شما به کارشناسان ما ارسال شود
              </p>
            </motion.div>
          </div>

          {/* Features Bar */}
          <div className="grid grid-cols-3 divide-x divide-neutral-100 dark:divide-neutral-800 border-b border-neutral-100 dark:border-neutral-800/50 rtl:divide-x-reverse">
            {[
              { icon: HiShieldCheck, label: 'پشتیبانی ۲۴/۷', desc: 'همه روزه در خدمت شما' },
              { icon: HiLightningBolt, label: 'پردازش سریع', desc: 'حداکثر تا ۲۴ ساعت' },
              { icon: HiCheckCircle, label: 'ضمانت بازگشت', desc: 'تضمین رضایت شما' },
            ].map((feature, idx) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                className="py-5 px-4 text-center group hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors duration-300"
              >
                <feature.icon className="w-6 h-6 mx-auto mb-2 text-primary-500 group-hover:scale-110 transition-transform duration-300" />
                <p className="font-semibold text-neutral-900 dark:text-white text-sm">
                  {feature.label}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Content Area */}
          <div className="p-6 sm:p-10">
            <AnimatePresence mode="wait">
              {submitResult.status === 'success' && submitResult.trackingCode && (
                <SuccessState
                  trackingCode={submitResult.trackingCode}
                  copiedCode={copiedCode}
                  onCopy={copyTrackingCode}
                  onReset={resetForm}
                  telegramLink={telegramLink}
                  whatsappLink={whatsappLink}
                />
              )}
            </AnimatePresence>

            {submitResult.status !== 'success' && (
              <>
                <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />

                <div className="mt-10">
                  <AnimatePresence mode="wait">
                    {currentStep === 1 && (
                      <Step1ServiceSelection
                        key="step1"
                        serviceTypes={serviceTypes}
                        selectedService={serviceType}
                        onSelect={(value) => setValue('serviceType', value)}
                      />
                    )}
                    {currentStep === 2 && (
                      <Step2Details
                        key="step2"
                        register={register}
                        errors={errors}
                        currencies={currencies}
                        countries={countries}
                        selectedCurrency={selectedCurrency}
                        setValue={setValue}
                        serviceType={serviceType}
                      />
                    )}
                    {currentStep === 3 && (
                      <Step3Review
                        key="step3"
                        selectedService={selectedService}
                        fullName={fullName}
                        phone={phone}
                        amount={amount}
                        selectedCurrencyInfo={selectedCurrencyInfo}
                        urgency={urgency}
                        register={register}
                        errors={errors}
                      />
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {submitResult.status === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="mt-6 p-5 bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-950/50 dark:to-red-900/30 rounded-2xl flex items-center gap-4 border border-red-200/50 dark:border-red-800/50"
                      >
                        <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-xl">
                          <HiExclamationCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="text-red-700 dark:text-red-300 font-medium">
                          {submitResult.message}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <NavigationButtons
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                    isSubmitting={isSubmitting}
                    onPrev={prevStep}
                    onNext={nextStep}
                    onSubmitClick={handleSubmit(onSubmit)}
                  />
                </div>

                <SupportLinks telegramLink={telegramLink} whatsappLink={whatsappLink} />
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ServiceRequestForm;

// ============================================
// Sub-Components
// ============================================

interface SupportLinksProps {
  telegramLink?: string | null;
  whatsappLink?: string | null;
}

function SupportLinks({ telegramLink, whatsappLink }: SupportLinksProps) {
  const hasTelegram = Boolean(telegramLink);
  const hasWhatsapp = Boolean(whatsappLink);

  if (!hasTelegram && !hasWhatsapp) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="mt-10 pt-8 border-t border-neutral-100 dark:border-neutral-800/50"
    >
      <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mb-5">
        روش ارتباط با پشتیبانی
      </p>
      <div className="flex justify-center gap-4">
        {hasTelegram && (
          <a
            href={telegramLink!}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl font-medium transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
          >
            <FaTelegram className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
            <span>تلگرام</span>
          </a>
        )}
        {hasWhatsapp && (
          <a
            href={whatsappLink!}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl font-medium transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 hover:-translate-y-0.5"
          >
            <FaWhatsapp className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
            <span>واتساپ</span>
          </a>
        )}
      </div>
    </motion.div>
  );
}

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const steps = [
    { num: 1, label: 'انتخاب خدمات', icon: HiSparkles },
    { num: 2, label: 'اطلاعات درخواست', icon: HiDocumentText },
    { num: 3, label: 'بررسی و ارسال', icon: HiCheckCircle },
  ];

  return (
    <div className="relative">
      {/* Progress Line Background */}
      <div className="absolute top-6 right-[calc(16.67%)] left-[calc(16.67%)] h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full" />

      {/* Progress Line Active */}
      <motion.div
        className="absolute top-6 right-[calc(16.67%)] h-1 bg-gradient-to-l from-primary-500 to-primary-600 rounded-full"
        initial={{ width: '0%' }}
        animate={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 66.66}%` }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />

      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const isActive = currentStep >= step.num;
          const isCompleted = currentStep > step.num;
          const Icon = step.icon;

          return (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center"
            >
              <motion.div
                animate={{
                  scale: isActive ? 1 : 0.9,
                  backgroundColor: isActive ? 'var(--primary-600)' : 'var(--neutral-200)',
                }}
                className={`relative w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-500 ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/40'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <HiCheckCircle className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <Icon className="w-5 h-5" />
                )}

                {/* Pulse Animation for Active Step */}
                {currentStep === step.num && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-primary-500"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  />
                )}
              </motion.div>

              <span
                className={`mt-3 text-xs sm:text-sm font-medium transition-colors duration-300 whitespace-nowrap ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-neutral-400 dark:text-neutral-500'
                }`}
              >
                {step.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

interface SuccessStateProps {
  trackingCode: string;
  copiedCode: boolean;
  onCopy: () => void;
  onReset: () => void;
  telegramLink?: string | null;
  whatsappLink?: string | null;
}

function SuccessState({
  trackingCode,
  copiedCode,
  onCopy,
  onReset,
  telegramLink,
  whatsappLink,
}: SuccessStateProps) {
  const hasTelegram = Boolean(telegramLink);
  const hasWhatsapp = Boolean(whatsappLink);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="text-center py-12 px-6"
    >
      {/* Success Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        className="relative w-24 h-24 mx-auto mb-8"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl rotate-6 opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl -rotate-6 opacity-20" />
        <div className="relative w-full h-full bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-green-500/30">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.4 }}
          >
            <HiCheckCircle className="w-12 h-12 text-white" />
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-3">
          درخواست شما با موفقیت ثبت شد!
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 mb-8">کد پیگیری شما:</p>
      </motion.div>

      {/* Tracking Code Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="relative inline-block mb-8"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-purple-500/20 rounded-2xl blur-xl" />
        <div className="relative flex items-center gap-4 bg-neutral-100 dark:bg-neutral-800 px-8 py-5 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50">
          <span className="text-2xl sm:text-3xl font-mono font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
            {trackingCode}
          </span>
          <button
            type="button"
            onClick={onCopy}
            className="p-3 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-all duration-300 hover:scale-105"
          >
            {copiedCode ? (
              <HiCheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <HiClipboardCopy className="w-6 h-6 text-neutral-500" />
            )}
          </button>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-sm text-neutral-500 dark:text-neutral-400 mb-10"
      >
        این کد را برای پیگیری درخواست خود نگه دارید
      </motion.p>

      {/* Support Links */}
      {(hasTelegram || hasWhatsapp) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-10"
        >
          <p className="text-neutral-600 dark:text-neutral-400 mb-5">
            برای پیگیری سریع‌تر با پشتیبانی تماس بگیرید:
          </p>
          <div className="flex justify-center gap-4">
            {hasTelegram && (
              <a
                href={telegramLink!}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl font-medium transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
              >
                <FaTelegram className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                تلگرام
              </a>
            )}
            {hasWhatsapp && (
              <a
                href={whatsappLink!}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl font-medium transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 hover:-translate-y-0.5"
              >
                <FaWhatsapp className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                واتساپ
              </a>
            )}
          </div>
        </motion.div>
      )}

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        type="button"
        onClick={onReset}
        className="px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-2xl font-medium transition-all duration-300 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5"
      >
        ثبت درخواست جدید
      </motion.button>
    </motion.div>
  );
}

interface Step1Props {
  serviceTypes: ServiceOption[];
  selectedService: ServiceType;
  onSelect: (value: ServiceType) => void;
}

function Step1ServiceSelection({ serviceTypes, selectedService, onSelect }: Step1Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-8"
    >
      <div className="text-center">
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
          نوع خدمات مورد نیاز خود را انتخاب کنید
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm">
          یکی از گزینه‌های زیر را انتخاب کنید
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {serviceTypes.map((service, index) => {
          const Icon = service.icon;
          const isSelected = selectedService === service.value;

          return (
            <motion.button
              key={service.value}
              type="button"
              onClick={() => onSelect(service.value)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`group relative p-5 rounded-2xl text-right transition-all duration-300 overflow-hidden ${
                isSelected
                  ? `bg-gradient-to-br ${service.gradient} border-2 border-primary-500/50 shadow-xl ${service.shadowColor}`
                  : 'bg-neutral-50 dark:bg-neutral-800/50 border-2 border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 hover:shadow-lg'
              }`}
            >
              {/* Background Gradient on Hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              />

              {/* Selection Indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 left-3 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center"
                >
                  <HiCheckCircle className="w-4 h-4 text-white" />
                </motion.div>
              )}

              <div className="relative flex flex-col items-start gap-4">
                <div
                  className={`p-3 rounded-xl ${service.bgColor} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className={`w-7 h-7 ${service.color}`} />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900 dark:text-white mb-1">
                    {service.label}
                  </h4>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

interface Step2Props {
  register: ReturnType<typeof useForm<ServiceRequestFormData>>['register'];
  errors: ReturnType<typeof useForm<ServiceRequestFormData>>['formState']['errors'];
  currencies: CurrencyOption[];
  countries: { value: string; label: string; flag: string }[];
  selectedCurrency: string;
  setValue: ReturnType<typeof useForm<ServiceRequestFormData>>['setValue'];
  serviceType: ServiceType;
}

function Step2Details({ register, errors, currencies, countries, serviceType }: Step2Props) {
  const inputBaseClass = `
    w-full px-5 py-4 rounded-2xl border-2 
    bg-white dark:bg-neutral-800/50 
    transition-all duration-300
    placeholder:text-neutral-400 dark:placeholder:text-neutral-500
    focus:outline-none focus:ring-0
  `;

  const inputNormalClass = `${inputBaseClass} border-neutral-200 dark:border-neutral-700 focus:border-primary-500 dark:focus:border-primary-500 hover:border-neutral-300 dark:hover:border-neutral-600`;
  const inputErrorClass = `${inputBaseClass} border-red-400 dark:border-red-500 focus:border-red-500`;

  const labelClass =
    'flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3';
  const iconClass = 'w-4 h-4 text-primary-500';

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-8"
    >
      {/* Personal Info Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
            <HiUser className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <h4 className="font-bold text-neutral-900 dark:text-white">اطلاعات شخصی</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>
              <HiUser className={iconClass} />
              نام و نام خانوادگی *
            </label>
            <input
              type="text"
              {...register('fullName')}
              className={errors.fullName ? inputErrorClass : inputNormalClass}
              placeholder="نام کامل خود را وارد کنید"
            />
            {errors.fullName && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-sm text-red-500 flex items-center gap-1"
              >
                <HiExclamationCircle className="w-4 h-4" />
                {errors.fullName.message}
              </motion.p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              <HiPhone className={iconClass} />
              شماره تماس *
            </label>
            <input
              type="tel"
              {...register('phone')}
              className={errors.phone ? inputErrorClass : inputNormalClass}
              placeholder="09123456789"
              dir="ltr"
            />
            {errors.phone && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-sm text-red-500 flex items-center gap-1"
              >
                <HiExclamationCircle className="w-4 h-4" />
                {errors.phone.message}
              </motion.p>
            )}
          </div>
        </div>

        <div>
          <label className={labelClass}>
            <HiMail className={iconClass} />
            ایمیل (اختیاری)
          </label>
          <input
            type="email"
            {...register('email')}
            className={inputNormalClass}
            placeholder="example@email.com"
            dir="ltr"
          />
        </div>
      </div>

      {/* Amount Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
            <HiCurrencyDollar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h4 className="font-bold text-neutral-900 dark:text-white">اطلاعات مالی</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>
              <HiCurrencyDollar className={iconClass} />
              مبلغ *
            </label>
            <input
              type="text"
              {...register('amount')}
              className={errors.amount ? inputErrorClass : inputNormalClass}
              placeholder="مبلغ مورد نظر"
              dir="ltr"
            />
            {errors.amount && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-sm text-red-500 flex items-center gap-1"
              >
                <HiExclamationCircle className="w-4 h-4" />
                {errors.amount.message}
              </motion.p>
            )}
          </div>

          <div>
            <label className={labelClass}>واحد ارز *</label>
            <select {...register('currency')} className={inputNormalClass}>
              <optgroup label="ارزهای فیات">
                {currencies
                  .filter((c) => c.type === 'fiat')
                  .map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.flag} {c.label}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="ارزهای دیجیتال">
                {currencies
                  .filter((c) => c.type === 'crypto')
                  .map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.flag} {c.label}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Service-specific fields */}
      {serviceType === 'INTERNATIONAL_TRANSFER' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <HiGlobe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="font-bold text-neutral-900 dark:text-white">اطلاعات حواله</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>
                <HiGlobe className={iconClass} />
                کشور مقصد *
              </label>
              <select {...register('destinationCountry')} className={inputNormalClass}>
                <option value="">انتخاب کنید</option>
                {countries.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.flag} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                <HiOfficeBuilding className={iconClass} />
                نام بانک مقصد
              </label>
              <input
                type="text"
                {...register('bankName')}
                className={inputNormalClass}
                placeholder="نام بانک گیرنده"
              />
            </div>
          </div>
        </div>
      )}

      {serviceType === 'ONLINE_PAYMENT' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <HiCreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h4 className="font-bold text-neutral-900 dark:text-white">اطلاعات خرید</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>
                <HiGlobe className={iconClass} />
                آدرس سایت / فروشگاه
              </label>
              <input
                type="text"
                {...register('websiteUrl')}
                className={inputNormalClass}
                placeholder="https://example.com"
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelClass}>
                <HiShoppingCart className={iconClass} />
                نام محصول / خدمات
              </label>
              <input
                type="text"
                {...register('productName')}
                className={inputNormalClass}
                placeholder="نام محصول یا خدماتی که می‌خواهید خریداری کنید"
              />
            </div>
          </div>
        </div>
      )}

      {serviceType === 'TUITION_PAYMENT' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <HiAcademicCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h4 className="font-bold text-neutral-900 dark:text-white">اطلاعات تحصیلی</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>
                <HiGlobe className={iconClass} />
                کشور مقصد *
              </label>
              <select {...register('destinationCountry')} className={inputNormalClass}>
                <option value="">انتخاب کنید</option>
                {countries.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.flag} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                <HiAcademicCap className={iconClass} />
                نام دانشگاه
              </label>
              <input
                type="text"
                {...register('universityName')}
                className={inputNormalClass}
                placeholder="نام دانشگاه یا موسسه آموزشی"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>شماره دانشجویی (اختیاری)</label>
            <input
              type="text"
              {...register('studentId')}
              className={inputNormalClass}
              placeholder="شماره دانشجویی"
              dir="ltr"
            />
          </div>
        </div>
      )}

      {serviceType === 'FREELANCE_INCOME' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <HiCash className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h4 className="font-bold text-neutral-900 dark:text-white">اطلاعات پلتفرم</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>
                <HiGlobe className={iconClass} />
                نام پلتفرم
              </label>
              <input
                type="text"
                {...register('platformName')}
                className={inputNormalClass}
                placeholder="مثلاً Upwork، Fiverr، Freelancer"
              />
            </div>
            <div>
              <label className={labelClass}>نام کاربری در پلتفرم</label>
              <input
                type="text"
                {...register('platformUsername')}
                className={inputNormalClass}
                placeholder="نام کاربری شما در پلتفرم"
                dir="ltr"
              />
            </div>
          </div>
        </div>
      )}

      {serviceType === 'SOFTWARE_PURCHASE' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
              <HiShoppingCart className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <h4 className="font-bold text-neutral-900 dark:text-white">اطلاعات نرم‌افزار</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>
                <HiShoppingCart className={iconClass} />
                نام نرم‌افزار / سرویس
              </label>
              <input
                type="text"
                {...register('softwareName')}
                className={inputNormalClass}
                placeholder="مثلاً Adobe، Microsoft 365، Spotify"
              />
            </div>
            <div>
              <label className={labelClass}>نوع اشتراک</label>
              <select {...register('subscriptionType')} className={inputNormalClass}>
                <option value="">انتخاب کنید</option>
                <option value="monthly">ماهانه</option>
                <option value="yearly">سالانه</option>
                <option value="lifetime">مادام‌العمر</option>
                <option value="one-time">یکبار خرید</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Urgency Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
            <HiLightningBolt className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <h4 className="font-bold text-neutral-900 dark:text-white">اولویت درخواست</h4>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="group relative cursor-pointer">
            <input type="radio" value="NORMAL" {...register('urgency')} className="peer sr-only" />
            <div className="p-5 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 peer-checked:border-green-500 peer-checked:bg-green-50 dark:peer-checked:bg-green-950/30 transition-all duration-300 hover:border-neutral-300 dark:hover:border-neutral-600 group-hover:shadow-lg">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <HiClock className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-center">
                  <span className="font-bold text-neutral-900 dark:text-white block">عادی</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    پردازش در ۲۴ ساعت
                  </span>
                </div>
              </div>
            </div>
          </label>

          <label className="group relative cursor-pointer">
            <input type="radio" value="URGENT" {...register('urgency')} className="peer sr-only" />
            <div className="p-5 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 peer-checked:border-red-500 peer-checked:bg-red-50 dark:peer-checked:bg-red-950/30 transition-all duration-300 hover:border-neutral-300 dark:hover:border-neutral-600 group-hover:shadow-lg">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <HiLightningBolt className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-center">
                  <span className="font-bold text-neutral-900 dark:text-white block">فوری</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    پردازش سریع‌تر
                  </span>
                </div>
              </div>
            </div>
          </label>
        </div>
      </div>
    </motion.div>
  );
}

interface Step3Props {
  selectedService: ServiceOption | undefined;
  fullName: string;
  phone: string;
  amount: string;
  selectedCurrencyInfo: CurrencyOption | undefined;
  urgency: string;
  register: ReturnType<typeof useForm<ServiceRequestFormData>>['register'];
  errors: ReturnType<typeof useForm<ServiceRequestFormData>>['formState']['errors'];
}

function Step3Review({
  selectedService,
  fullName,
  phone,
  amount,
  selectedCurrencyInfo,
  urgency,
  register,
}: Step3Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-8"
    >
      <div className="text-center">
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
          بررسی اطلاعات درخواست
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm">
          لطفاً اطلاعات وارد شده را بررسی کنید
        </p>
      </div>

      {/* Summary Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-neutral-50 to-neutral-100/50 dark:from-neutral-800/50 dark:to-neutral-900/50 rounded-3xl p-6 sm:p-8 border border-neutral-200/50 dark:border-neutral-700/50">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-primary-500/10 to-transparent rounded-full blur-2xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-purple-500/10 to-transparent rounded-full blur-2xl" />

        {/* Service Header */}
        {selectedService && (
          <div className="relative flex items-center gap-4 pb-6 mb-6 border-b border-neutral-200 dark:border-neutral-700">
            <div
              className={`p-4 rounded-2xl ${selectedService.bgColor} shadow-lg ${selectedService.shadowColor}`}
            >
              <selectedService.icon className={`w-8 h-8 ${selectedService.color}`} />
            </div>
            <div>
              <p className="font-bold text-lg text-neutral-900 dark:text-white">
                {selectedService.label}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {selectedService.description}
              </p>
            </div>
          </div>
        )}

        {/* Info Grid */}
        <div className="relative grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              نام
            </p>
            <p className="font-semibold text-neutral-900 dark:text-white">{fullName || '-'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              شماره تماس
            </p>
            <p className="font-semibold text-neutral-900 dark:text-white" dir="ltr">
              {phone || '-'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              مبلغ
            </p>
            <p className="font-semibold text-neutral-900 dark:text-white">
              {amount || '-'} {selectedCurrencyInfo?.label || ''}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              اولویت
            </p>
            <p className="font-semibold text-neutral-900 dark:text-white">
              {urgency === 'URGENT' ? (
                <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  <HiLightningBolt className="w-4 h-4" />
                  فوری
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <HiClock className="w-4 h-4" />
                  عادی
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
          <HiDocumentText className="w-4 h-4 text-primary-500" />
          توضیحات تکمیلی (اختیاری)
        </label>
        <textarea
          {...register('description')}
          rows={4}
          className="w-full px-5 py-4 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 focus:border-primary-500 dark:focus:border-primary-500 focus:outline-none focus:ring-0 transition-all duration-300 resize-none placeholder:text-neutral-400"
          placeholder="اگر توضیحات خاصی دارید اینجا بنویسید..."
        />
      </div>

      {/* Security Note */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-start gap-4 p-5 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 rounded-2xl border border-blue-200/50 dark:border-blue-800/50"
      >
        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex-shrink-0">
          <HiShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="font-semibold text-blue-900 dark:text-blue-300">امنیت اطلاعات</p>
          <p className="text-sm text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
            اطلاعات شما محرمانه است و فقط برای پیگیری درخواست استفاده می‌شود.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface NavigationButtonsProps {
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmitClick: () => void;
}

function NavigationButtons({
  currentStep,
  totalSteps,
  isSubmitting,
  onPrev,
  onNext,
  onSubmitClick,
}: NavigationButtonsProps) {
  return (
    <div className="flex justify-between mt-10 gap-4">
      {currentStep > 1 ? (
        <motion.button
          type="button"
          onClick={onPrev}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          className="group flex items-center gap-3 px-6 py-4 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all duration-300"
        >
          <HiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          <span className="font-medium">مرحله قبل</span>
        </motion.button>
      ) : (
        <div />
      )}

      {currentStep < totalSteps ? (
        <motion.button
          type="button"
          onClick={onNext}
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.98 }}
          className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-medium transition-all duration-300 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30"
        >
          <span>مرحله بعد</span>
          <HiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
        </motion.button>
      ) : (
        <motion.button
          type="button"
          disabled={isSubmitting}
          onClick={onSubmitClick}
          whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
          whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
          className="group flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-neutral-400 disabled:to-neutral-500 disabled:cursor-not-allowed text-white font-medium transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 disabled:shadow-none"
        >
          {isSubmitting ? (
            <>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>در حال ارسال...</span>
            </>
          ) : (
            <>
              <HiCheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              <span>ثبت درخواست</span>
            </>
          )}
        </motion.button>
      )}
    </div>
  );
}
