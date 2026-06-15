'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from '@/lib/motion-shim';
import { HiOutlineClipboardDocumentList, HiOutlineClock, HiOutlineArrowLeft } from 'react-icons/hi2';
import { FaTelegram, FaWhatsapp } from 'react-icons/fa';
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
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function ServiceRequestsWidget() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [stats, setStats] = useState({ pending: 0, todayCount: 0 });
  const [loading, setLoading] = useState(true);

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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 animate-pulse">
        <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-l from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
              <HiOutlineClipboardDocumentList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">درخواست‌های خدمات</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {stats.pending} در انتظار • {stats.todayCount} امروز
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/service-requests"
            className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium"
          >
            مشاهده همه
            <HiOutlineArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {requests.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <HiOutlineClock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>درخواست در انتظاری وجود ندارد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <Link
                key={request.id}
                href="/dashboard/service-requests"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    {request.contactMethod === 'telegram' ? (
                      <FaTelegram className="w-5 h-5 text-[#0088cc]" />
                    ) : (
                      <FaWhatsapp className="w-5 h-5 text-[#25D366]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white text-sm">
                        {request.fullName}
                      </span>
                      {request.urgency === 'URGENT' && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded font-medium">
                          فوری
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{serviceTypeLabels[request.serviceType]}</span>
                      <span>•</span>
                      <span className="font-mono">{request.amount} {request.currency}</span>
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusColors[request.status]}`}>
                    {request.trackingCode}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
