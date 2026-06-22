'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from '@/lib/motion-shim';
import {
  HiSearch,
  HiFilter,
  HiEye,
  HiTrash,
  HiRefresh,
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiPhone,
  HiMail,
  HiChevronRight,
  HiChevronLeft,
  HiGlobe,
  HiCreditCard,
  HiAcademicCap,
  HiCash,
  HiShoppingCart,
  HiDesktopComputer,
  HiClipboardList,
  HiSparkles,
  HiTemplate,
} from 'react-icons/hi';
import { FaTelegram, FaWhatsapp } from 'react-icons/fa';
import {
  getServiceRequests,
  updateServiceRequestStatus,
  deleteServiceRequest,
} from '@/actions/serviceRequestActions';

interface ServiceRequest {
  id: string;
  trackingCode: string;
  fullName: string;
  phone: string;
  email: string | null;
  serviceType: string;
  amount: string;
  currency: string;
  description: string | null;
  urgency: string;
  contactMethod: string;
  status: string;
  adminNotes: string | null;
  createdAt: Date;
}

const statusConfig = {
  PENDING: {
    label: 'در انتظار',
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    icon: HiClock,
    dot: 'bg-amber-500',
  },
  IN_PROGRESS: {
    label: 'در حال انجام',
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    icon: HiRefresh,
    dot: 'bg-blue-500',
  },
  COMPLETED: {
    label: 'تکمیل شده',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    icon: HiCheckCircle,
    dot: 'bg-emerald-500',
  },
  CANCELLED: {
    label: 'لغو شده',
    color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800',
    icon: HiXCircle,
    dot: 'bg-rose-500',
  },
};

const serviceTypeLabels: Record<string, { label: string; icon: typeof HiGlobe }> = {
  INTERNATIONAL_TRANSFER: { label: 'حواله بین‌المللی', icon: HiGlobe },
  ONLINE_PAYMENT: { label: 'پرداخت آنلاین', icon: HiCreditCard },
  TUITION_PAYMENT: { label: 'پرداخت شهریه', icon: HiAcademicCap },
  FREELANCE_INCOME: { label: 'نقد کردن درآمد', icon: HiCash },
  SOFTWARE_PURCHASE: { label: 'خرید نرم‌افزار', icon: HiDesktopComputer },
  OTHER: { label: 'سایر', icon: HiClipboardList },
};

export default function ServiceRequestsTable() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const result = await getServiceRequests({ status: statusFilter, page, search, limit: 15 });
    if (result.success && result.data) {
      setRequests(result.data as ServiceRequest[]);
      setTotalPages(result.pagination?.totalPages || 1);
    }
    setLoading(false);
  }, [statusFilter, page, search]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    const result = await updateServiceRequestStatus(
      id,
      newStatus as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    );
    if (result.success) {
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
      fetchRequests();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این درخواست اطمینان دارید؟')) return;
    const result = await deleteServiceRequest(id);
    if (result.success) {
      fetchRequests();
      setSelectedRequest(null);
    } else {
      alert(result.message);
    }
  };

  const openMessenger = (request: ServiceRequest) => {
    const message = `سلام ${request.fullName}،\nدرخواست شما با کد پیگیری ${request.trackingCode} دریافت شد.`;
    const encoded = encodeURIComponent(message);
    const url =
      request.contactMethod === 'telegram'
        ? `https://t.me/${request.phone}?text=${encoded}`
        : `https://wa.me/${request.phone.replace(/^0/, '98')}?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      {/* Main Card */}
      <div className="dash-panel overflow-hidden">
        {/* Filters Header */}
        <div className="p-6 border-b border-neutral-200/60 dark:border-neutral-700/60 bg-gradient-to-l from-neutral-50/80 to-white/80 dark:from-neutral-800/80 dark:to-neutral-900/80">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[280px]">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">
                <HiSearch className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="جستجو در کد پیگیری، نام یا شماره..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pr-12 pl-5 py-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all duration-300"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                <HiFilter className="w-5 h-5" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-5 py-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all duration-300 cursor-pointer"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="PENDING">در انتظار</option>
                <option value="IN_PROGRESS">در حال انجام</option>
                <option value="COMPLETED">تکمیل شده</option>
                <option value="CANCELLED">لغو شده</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50/80 dark:bg-neutral-800/50">
                <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  کد پیگیری
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  مشتری
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  نوع خدمات
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  مبلغ
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  وضعیت
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  تاریخ
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-6 py-5">
                        <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded-lg animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                        <HiSearch className="w-8 h-8 text-neutral-400" />
                      </div>
                      <p className="text-neutral-500 dark:text-neutral-400 font-medium">
                        درخواستی یافت نشد
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((request, index) => {
                  const status = statusConfig[request.status as keyof typeof statusConfig];
                  const serviceType = serviceTypeLabels[request.serviceType] || {
                    label: request.serviceType,
                    icon: HiTemplate,
                  };
                  const ServiceIcon = serviceType.icon;
                  return (
                    <motion.tr
                      key={request.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                      className="group hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors duration-300"
                    >
                      {/* Tracking Code */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg">
                            {request.trackingCode}
                          </span>
                          {request.urgency === 'URGENT' && (
                            <span className="px-2 py-1 text-[10px] font-bold bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-md animate-pulse">
                              فوری
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center text-lg font-bold text-neutral-600 dark:text-neutral-300">
                            {request.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-neutral-900 dark:text-white">
                              {request.fullName}
                            </p>
                            <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                              <HiPhone className="w-3 h-3" />
                              <span className="font-mono">{request.phone}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Service Type */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <ServiceIcon className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                          <span className="text-sm text-neutral-700 dark:text-neutral-300">
                            {serviceType.label}
                          </span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-5">
                        <span className="font-mono text-sm font-semibold text-neutral-900 dark:text-white">
                          {Number(request.amount).toLocaleString()}{' '}
                          <span className="text-neutral-500 font-normal">{request.currency}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${status?.color}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${status?.dot}`} />
                          {status?.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-5">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          {new Date(request.createdAt).toLocaleDateString('fa-IR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="p-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-all duration-300 hover:scale-110"
                            title="مشاهده جزئیات"
                          >
                            <HiEye className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                          </button>
                          <button
                            onClick={() => openMessenger(request)}
                            className="p-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-all duration-300 hover:scale-110"
                            title="ارسال پیام"
                          >
                            {request.contactMethod === 'telegram' ? (
                              <FaTelegram className="w-5 h-5 text-[#0088cc]" />
                            ) : (
                              <FaWhatsapp className="w-5 h-5 text-[#25D366]" />
                            )}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-neutral-200/60 dark:border-neutral-700/60 bg-gradient-to-l from-neutral-50/80 to-white/80 dark:from-neutral-800/80 dark:to-neutral-900/80">
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all duration-300 hover:shadow-md"
              >
                <HiChevronRight className="w-5 h-5" />
                قبلی
              </button>

              <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <span className="text-amber-700 dark:text-amber-400 font-bold">{page}</span>
                <span className="text-neutral-400">/</span>
                <span className="text-neutral-600 dark:text-neutral-400">{totalPages}</span>
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all duration-300 hover:shadow-md"
              >
                بعدی
                <HiChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedRequest(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="dash-panel p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25">
                    <HiEye className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                    جزئیات درخواست
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  <HiXCircle className="w-6 h-6 text-neutral-400" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Tracking Code Card */}
                <div className="p-5 bg-gradient-to-l from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-200/50 dark:border-amber-800/50">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-2">
                    کد پیگیری
                  </p>
                  <p className="font-mono text-2xl font-black text-amber-700 dark:text-amber-300">
                    {selectedRequest.trackingCode}
                  </p>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl">
                    <p className="text-xs text-neutral-500 mb-1.5">نام مشتری</p>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {selectedRequest.fullName}
                    </p>
                  </div>
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl">
                    <p className="text-xs text-neutral-500 mb-1.5">شماره تماس</p>
                    <p className="font-mono font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                      <HiPhone className="w-4 h-4 text-neutral-400" />
                      {selectedRequest.phone}
                    </p>
                  </div>
                </div>

                {selectedRequest.email && (
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl">
                    <p className="text-xs text-neutral-500 mb-1.5">ایمیل</p>
                    <p className="text-neutral-900 dark:text-white flex items-center gap-2">
                      <HiMail className="w-4 h-4 text-neutral-400" />
                      {selectedRequest.email}
                    </p>
                  </div>
                )}

                {/* Service & Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl">
                    <p className="text-xs text-neutral-500 mb-1.5">نوع خدمات</p>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const Icon = serviceTypeLabels[selectedRequest.serviceType]?.icon || HiTemplate;
                        return <Icon className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />;
                      })()}
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {serviceTypeLabels[selectedRequest.serviceType]?.label ||
                          selectedRequest.serviceType}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl">
                    <p className="text-xs text-neutral-500 mb-1.5">مبلغ</p>
                    <p className="font-mono text-lg font-bold text-neutral-900 dark:text-white">
                      {Number(selectedRequest.amount).toLocaleString()}{' '}
                      <span className="text-sm text-neutral-500 font-normal">
                        {selectedRequest.currency}
                      </span>
                    </p>
                  </div>
                </div>

                {selectedRequest.description && (
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl">
                    <p className="text-xs text-neutral-500 mb-2">توضیحات</p>
                    <p className="text-neutral-700 dark:text-neutral-300 text-sm leading-relaxed">
                      {selectedRequest.description}
                    </p>
                  </div>
                )}

                {/* Status Change */}
                <div>
                  <p className="text-xs text-neutral-500 mb-3 font-medium">تغییر وضعیت</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => handleStatusChange(selectedRequest.id, key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-300 ${
                          selectedRequest.status === key
                            ? config.color
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                  <button
                    onClick={() => openMessenger(selectedRequest)}
                    className={`flex-1 py-3.5 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg ${
                      selectedRequest.contactMethod === 'telegram'
                        ? 'bg-[#0088cc] hover:bg-[#0077b5] shadow-[#0088cc]/25'
                        : 'bg-[#25D366] hover:bg-[#20bd5a] shadow-[#25D366]/25'
                    }`}
                  >
                    {selectedRequest.contactMethod === 'telegram' ? (
                      <FaTelegram className="w-5 h-5" />
                    ) : (
                      <FaWhatsapp className="w-5 h-5" />
                    )}
                    ارسال پیام
                  </button>
                  <button
                    onClick={() => handleDelete(selectedRequest.id)}
                    className="px-6 py-3.5 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all duration-300"
                  >
                    <HiTrash className="w-5 h-5" />
                    حذف
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
