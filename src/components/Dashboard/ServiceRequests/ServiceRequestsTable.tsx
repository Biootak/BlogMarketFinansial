'use client';

import {
  deleteServiceRequest,
  getServiceRequests,
  updateServiceRequestStatus,
} from '@/actions/serviceRequestActions';
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, ChevronLeft, ChevronRight, Clock, Eye, Filter, Mail, MessageCircle, Phone, RefreshCw, Search, Send, Trash2, XCircle } from 'lucide-react';


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
    color:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    icon: Clock,
    dot: 'bg-amber-500',
  },
  IN_PROGRESS: {
    label: 'در حال انجام',
    color:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    icon: RefreshCw,
    dot: 'bg-blue-500',
  },
  COMPLETED: {
    label: 'تکمیل شده',
    color:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    icon: CheckCircle,
    dot: 'bg-emerald-500',
  },
  CANCELLED: {
    label: 'لغو شده',
    color:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800',
    icon: XCircle,
    dot: 'bg-rose-500',
  },
};

const serviceTypeLabels: Record<string, { label: string; emoji: string }> = {
  INTERNATIONAL_TRANSFER: { label: 'حواله بین‌المللی', emoji: '🌍' },
  ONLINE_PAYMENT: { label: 'پرداخت آنلاین', emoji: '💳' },
  TUITION_PAYMENT: { label: 'پرداخت شهریه', emoji: '🎓' },
  FREELANCE_INCOME: { label: 'نقد کردن درآمد', emoji: '💼' },
  SOFTWARE_PURCHASE: { label: 'خرید نرم‌افزار', emoji: '💻' },
  OTHER: { label: 'سایر', emoji: '📋' },
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
      newStatus as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
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
    <div className="relative">
      {/* Main Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/60 shadow-xl backdrop-blur-sm transition-all duration-300 dark:border-slate-700/50 dark:bg-slate-800/60">
        {/* Filters Header */}
        <div className="border-b border-slate-200/60 bg-gradient-to-l from-slate-50/80 to-white/80 p-6 dark:border-slate-700/50 dark:from-slate-800/80 dark:to-slate-800/80">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[280px]">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="جستجو در کد پیگیری، نام یا شماره..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-11 w-full rounded-xl border border-slate-200/60 bg-white/80 pr-12 pl-5 text-sm shadow-sm backdrop-blur-sm transition-all duration-300 placeholder:text-slate-400 hover:border-slate-300 hover:shadow-md focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100/50 dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-900/30"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                <Filter className="w-5 h-5" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-11 cursor-pointer rounded-xl border border-slate-200/60 bg-white/80 px-5 text-sm shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100/50 dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-white dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-900/30"
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

        {/* Desktop Table */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/60 bg-gradient-to-l from-slate-50/80 to-white/80 dark:border-slate-700/50 dark:from-slate-800/80 dark:to-slate-800/80">
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  کد پیگیری
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  مشتری
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  نوع خدمات
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  مبلغ
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  وضعیت
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  تاریخ
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-6 py-5">
                        <div className="h-5 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                        <Search className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="font-medium text-slate-500 dark:text-slate-400">
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
                    emoji: '📋',
                  };
                  return (
                    <tr
                      key={request.id}
                      className="group transition-all duration-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      {/* Tracking Code */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-blue-50 px-3 py-1.5 font-mono text-sm font-bold text-blue-700 shadow-sm dark:bg-blue-900/30 dark:text-blue-300">
                            {request.trackingCode}
                          </span>
                          {request.urgency === 'URGENT' && (
                            <span className="animate-pulse rounded-md bg-red-100 px-2 py-1 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                              فوری
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-neutral-br text-lg font-bold text-slate-600 shadow-sm dark:from-slate-700 dark:to-slate-800 dark:text-slate-300">
                            {request.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {request.fullName}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                              <Phone className="h-3 w-3" />
                              <span className="font-mono">{request.phone}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Service Type */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{serviceType.emoji}</span>
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {serviceType.label}
                          </span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-5">
                        <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                          {Number(request.amount).toLocaleString()}{' '}
                          <span className="font-normal text-slate-500">{request.currency}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold ${status?.color}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${status?.dot}`} />
                          {status?.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-5">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(request.createdAt).toLocaleDateString('fa-IR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 opacity-60 transition-opacity duration-300 group-hover:opacity-100">
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="rounded-xl p-2.5 transition-all duration-300 hover:scale-110 hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="مشاهده جزئیات"
                          >
                            <Eye className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                          </button>
                          <button
                            onClick={() => openMessenger(request)}
                            className="rounded-xl p-2.5 transition-all duration-300 hover:scale-110 hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="ارسال پیام"
                          >
                            {request.contactMethod === 'telegram' ? (
                              <Send className="h-5 w-5 text-[#0088cc]" />
                            ) : (
                              <MessageCircle className="h-5 w-5 text-[#25D366]" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="grid gap-4 p-4 lg:hidden">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-xl border border-slate-200/60 bg-slate-100 dark:border-slate-700/50 dark:bg-slate-800"
              />
            ))
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <p className="font-medium text-slate-500 dark:text-slate-400">درخواستی یافت نشد</p>
            </div>
          ) : (
            requests.map((request, index) => {
              const status = statusConfig[request.status as keyof typeof statusConfig];
              const serviceType = serviceTypeLabels[request.serviceType] || {
                label: request.serviceType,
                emoji: '📋',
              };
              return (
                <div
                  key={request.id}
                  className="group overflow-hidden rounded-xl border border-slate-200/60 bg-white/80 p-4 shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-800/80"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {request.trackingCode}
                      </span>
                      {request.urgency === 'URGENT' && (
                        <span className="animate-pulse rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                          فوری
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${status?.color}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${status?.dot}`} />
                      {status?.label}
                    </span>
                  </div>

                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl gradient-neutral-br text-lg font-bold text-slate-600 shadow-sm dark:from-slate-700 dark:to-slate-800 dark:text-slate-300">
                      {request.fullName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {request.fullName}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <Phone className="h-3 w-3" />
                        <span className="font-mono">{request.phone}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mb-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{serviceType.emoji}</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {serviceType.label}
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {Number(request.amount).toLocaleString()}{' '}
                      <span className="text-xs font-normal text-slate-500">{request.currency}</span>
                    </span>
                  </div>

                  <div className="flex gap-2 border-t border-slate-200/60 pt-3 dark:border-slate-700/50">
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 shadow-sm transition-all duration-300 hover:scale-105 hover:bg-blue-100 active:scale-95 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      <Eye className="h-4 w-4" />
                      <span>جزئیات</span>
                    </button>
                    <button
                      onClick={() => openMessenger(request)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white shadow-sm transition-all duration-300 hover:scale-105 active:scale-95 ${
                        request.contactMethod === 'telegram'
                          ? 'bg-[#0088cc] hover:bg-[#0077b5]'
                          : 'bg-[#25D366] hover:bg-[#20bd5a]'
                      }`}
                    >
                      {request.contactMethod === 'telegram' ? (
                        <Send className="h-4 w-4" />
                      ) : (
                        <MessageCircle className="h-4 w-4" />
                      )}
                      <span>پیام</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-200/60 bg-gradient-to-l from-slate-50/80 to-white/80 p-6 dark:border-slate-700/50 dark:from-slate-800/80 dark:to-slate-800/80">
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-medium text-slate-700 shadow-sm transition-all duration-300 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <ChevronRight className="h-5 w-5" />
                قبلی
              </button>

              <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 dark:border-blue-800 dark:bg-blue-900/20">
                <span className="font-bold text-blue-700 dark:text-blue-400">{page}</span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-600 dark:text-slate-400">{totalPages}</span>
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-medium text-slate-700 shadow-sm transition-all duration-300 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                بعدی
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200/60 bg-white p-8 shadow-2xl transition-all duration-300 dark:border-slate-700/60 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 shadow-lg shadow-blue-500/25">
                  <Eye className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">جزئیات درخواست</h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-xl p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XCircle className="h-6 w-6 text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Tracking Code Card */}
              <div className="rounded-2xl border border-blue-200/50 bg-gradient-to-l from-blue-50 to-blue-50 p-5 dark:border-blue-800/50 dark:from-blue-900/20 dark:to-blue-900/20">
                <p className="mb-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                  کد پیگیری
                </p>
                <p className="font-mono text-2xl font-black text-blue-700 dark:text-blue-300">
                  {selectedRequest.trackingCode}
                </p>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <p className="mb-1.5 text-xs text-slate-500">نام مشتری</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {selectedRequest.fullName}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <p className="mb-1.5 text-xs text-slate-500">شماره تماس</p>
                  <p className="flex items-center gap-2 font-mono font-semibold text-slate-900 dark:text-white">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {selectedRequest.phone}
                  </p>
                </div>
              </div>

              {selectedRequest.email && (
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <p className="mb-1.5 text-xs text-slate-500">ایمیل</p>
                  <p className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {selectedRequest.email}
                  </p>
                </div>
              )}

              {/* Service & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <p className="mb-1.5 text-xs text-slate-500">نوع خدمات</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {serviceTypeLabels[selectedRequest.serviceType]?.emoji || '📋'}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {serviceTypeLabels[selectedRequest.serviceType]?.label ||
                        selectedRequest.serviceType}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <p className="mb-1.5 text-xs text-slate-500">مبلغ</p>
                  <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                    {Number(selectedRequest.amount).toLocaleString()}{' '}
                    <span className="text-sm font-normal text-slate-500">
                      {selectedRequest.currency}
                    </span>
                  </p>
                </div>
              </div>

              {selectedRequest.description && (
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <p className="mb-2 text-xs text-slate-500">توضیحات</p>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {selectedRequest.description}
                  </p>
                </div>
              )}

              {/* Status Change */}
              <div>
                <p className="mb-3 text-xs font-medium text-slate-500">تغییر وضعیت</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => handleStatusChange(selectedRequest.id, key)}
                      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                        selectedRequest.status === key
                          ? config.color
                          : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
                <button
                  onClick={() => openMessenger(selectedRequest)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white transition-all duration-300 hover:shadow-lg ${
                    selectedRequest.contactMethod === 'telegram'
                      ? 'bg-[#0088cc] shadow-[#0088cc]/25 hover:bg-[#0077b5]'
                      : 'bg-[#25D366] shadow-[#25D366]/25 hover:bg-[#20bd5a]'
                  }`}
                >
                  {selectedRequest.contactMethod === 'telegram' ? (
                    <Send className="h-5 w-5" />
                  ) : (
                    <MessageCircle className="h-5 w-5" />
                  )}
                  ارسال پیام
                </button>
                <button
                  onClick={() => handleDelete(selectedRequest.id)}
                  className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-6 py-3.5 font-semibold text-red-600 transition-all duration-300 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  <Trash2 className="h-5 w-5" />
                  حذف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
