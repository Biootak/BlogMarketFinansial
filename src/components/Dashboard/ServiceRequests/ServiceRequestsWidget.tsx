'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  HiOutlineClipboardDocumentList, 
  HiOutlineClock, 
  HiOutlineArrowLeft,
  HiOutlineDocumentDuplicate,
} from 'react-icons/hi2';
import { FaTelegram, FaWhatsapp } from 'react-icons/fa';
import { useToast } from '@/components/ui/use-toast';
import { getServiceRequests, getServiceRequestStats } from '@/actions/serviceRequestActions';

interface ServiceRequest {
  id: string;
  trackingCode: string;
  fullName: string;
  serviceType: string;
  amount: string;
  currency: string;
  status: string;
  urgency: string;
  contactMethod: string;
  createdAt: Date;
}

const serviceTypeLabels: Record<string, string> = {
  INTERNATIONAL_TRANSFER: 'حواله',
  ONLINE_PAYMENT: 'پرداخت',
  TUITION_PAYMENT: 'شهریه',
  FREELANCE_INCOME: 'فریلنس',
  SOFTWARE_PURCHASE: 'نرم‌افزار',
  OTHER: 'سایر',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  COMPLETED: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  CANCELLED: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
};

export default function ServiceRequestsWidget() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [stats, setStats] = useState({ pending: 0, todayCount: 0 });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const handleCopyTrackingCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'کپی شد!',
      description: `کد پیگیری ${code} در کلیپ‌بورد کپی شد.`,
      variant: 'success',
    });
  };

  useEffect(() => {
    async function fetchData() {
      const [requestsResult, statsResult] = await Promise.all([
        getServiceRequests({ limit: 5, status: 'PENDING' }),
        getServiceRequestStats(),
      ]);

      if (requestsResult.success && requestsResult.data) {
        setRequests(requestsResult.data as ServiceRequest[]);
      }
      if (statsResult.success && statsResult.data) {
        setStats({ pending: statsResult.data.pending, todayCount: statsResult.data.todayCount });
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 animate-pulse" />
        
        <div className="p-5 sm:p-6 animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            <div className="flex-1">
              <div className="h-5 w-36 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
              <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </div>
          
          {/* Items skeleton */}
          <div className="space-y-2.5">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i} 
                className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="w-11 h-11 bg-slate-200 dark:bg-slate-700 rounded-xl flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
                <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      {/* Decorative gradient top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500" />
      
      {/* Header */}
      <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md">
              <HiOutlineClipboardDocumentList className="w-5 h-5" />
            </div>
          </div>
          
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              درخواست‌های خدمات
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-medium">
                <HiOutlineClock className="w-3 h-3" />
                {stats.pending} در انتظار
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="font-medium">{stats.todayCount} امروز</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5">
        {requests.length === 0 ? (
          <div className="text-center py-10 sm:py-12 text-slate-500 dark:text-slate-400">
            <HiOutlineClock className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 opacity-30 text-orange-500" />
            <p className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
              درخواست در انتظاری وجود ندارد
            </p>
            <p className="text-xs sm:text-sm opacity-60">همه درخواست‌ها پردازش شده‌اند</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {requests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: index * 0.05, 
                  duration: 0.2,
                  ease: 'easeOut'
                }}
                className="group relative p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-orange-50/50 dark:hover:bg-slate-800/70 transition-colors duration-200 border border-slate-200/50 dark:border-slate-700/50"
              >
                <div className="flex items-start gap-3">
                  {/* Contact Method Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm border border-slate-200/50 dark:border-slate-600/50">
                      {request.contactMethod === 'telegram' ? (
                        <FaTelegram className="w-5 h-5 text-[#0088cc]" />
                      ) : (
                        <FaWhatsapp className="w-5 h-5 text-[#25D366]" />
                      )}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-grow min-w-0 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white flex-1">
                        {request.fullName}
                      </span>
                      {request.urgency === 'URGENT' && (
                        <span className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-md font-bold">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          فوری
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs min-w-0 flex-1">
                        <span className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium flex-shrink-0">
                          {serviceTypeLabels[request.serviceType]}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {request.amount} <span className="text-orange-600 dark:text-orange-400">{request.currency}</span>
                        </span>
                      </div>
                      
                      {/* Status Badge - Compact */}
                      <motion.div
                        className={`flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold ${statusColors[request.status]} shadow-sm`}
                        whileHover={{ scale: 1.05 }}
                      >
                        {request.status === 'PENDING' && '⏳'}
                        {request.status === 'IN_PROGRESS' && '🔄'}
                        {request.status === 'COMPLETED' && '✓'}
                        {request.status === 'CANCELLED' && '✕'}
                      </motion.div>
                    </div>
                    
                    {/* Tracking Code - Compact */}
                    <button
                      type="button"
                      onClick={() => handleCopyTrackingCode(request.trackingCode)}
                      className="group/code w-full inline-flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-all duration-200 cursor-pointer"
                      title="کلیک برای کپی کد پیگیری"
                    >
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex-shrink-0">کد:</span>
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                        {request.trackingCode}
                      </span>
                      <HiOutlineDocumentDuplicate className="w-3.5 h-3.5 text-slate-400 group-hover/code:text-orange-500 transition-colors flex-shrink-0" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with View All Button */}
      {requests.length > 0 && (
        <div className="px-5 sm:px-6 py-3 sm:py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <Link
            href="/dashboard/service-requests"
            className="group flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-bold transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span>مشاهده همه درخواست‌ها</span>
            <HiOutlineArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
          </Link>
        </div>
      )}
    </motion.div>
  );
}
