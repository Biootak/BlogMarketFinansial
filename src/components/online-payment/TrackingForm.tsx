'use client';

import { getServiceRequestByTrackingCode } from '@/actions/serviceRequestActions';
import { motion } from 'framer-motion';
import { type FC, useState } from 'react';
import { CheckCircle, Clock, RefreshCw, Search, XCircle } from 'lucide-react';

const statusConfig = {
  PENDING: { label: 'در انتظار بررسی', color: 'yellow', icon: Clock },
  IN_PROGRESS: { label: 'در حال انجام', color: 'blue', icon: RefreshCw },
  COMPLETED: { label: 'تکمیل شده', color: 'green', icon: CheckCircle },
  CANCELLED: { label: 'لغو شده', color: 'red', icon: XCircle },
};

const serviceTypeLabels: Record<string, string> = {
  INTERNATIONAL_TRANSFER: 'حواله بین‌المللی',
  ONLINE_PAYMENT: 'پرداخت آنلاین',
  TUITION_PAYMENT: 'پرداخت شهریه',
  FREELANCE_INCOME: 'نقد کردن درآمد فریلنسری',
  SOFTWARE_PURCHASE: 'خرید نرم‌افزار/اشتراک',
  OTHER: 'سایر خدمات',
};

const TrackingForm: FC = () => {
  const [trackingCode, setTrackingCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    data?: {
      trackingCode: string;
      fullName: string;
      serviceType: string;
      amount: string;
      currency: string;
      status: keyof typeof statusConfig;
      urgency: string;
      createdAt: Date;
    };
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingCode.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await getServiceRequestByTrackingCode(trackingCode.trim().toUpperCase());
      setResult(response as typeof result);
    } catch {
      setResult({ success: false, message: 'خطایی رخ داد. لطفاً دوباره تلاش کنید.' });
    } finally {
      setIsLoading(false);
    }
  };

  const status = result?.data?.status ? statusConfig[result.data.status] : null;

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={trackingCode}
          onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
          placeholder="کد پیگیری (مثال: BT-XXXXX-XXXX)"
          className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
          dir="ltr"
        />
        <motion.button
          type="submit"
          disabled={isLoading || !trackingCode.trim()}
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </motion.button>
      </form>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          {result.success && result.data ? (
            <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">وضعیت</span>
                {status && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-${status.color}-100 dark:bg-${status.color}-900/30 text-${status.color}-700 dark:text-${status.color}-400`}
                  >
                    <status.icon className="w-4 h-4" />
                    {status.label}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">نام</span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {result.data.fullName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">نوع خدمات</span>
                <span className="text-neutral-700 dark:text-neutral-300">
                  {serviceTypeLabels[result.data.serviceType] || result.data.serviceType}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">مبلغ</span>
                <span className="font-mono text-neutral-900 dark:text-white">
                  {result.data.amount} {result.data.currency}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">تاریخ ثبت</span>
                <span className="text-neutral-700 dark:text-neutral-300 text-sm">
                  {new Date(result.data.createdAt).toLocaleDateString('fa-IR')}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl text-center">
              {result.message}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default TrackingForm;
