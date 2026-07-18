'use client';

/**
 * ServiceRequestsTable — 2026-07-04 redesign
 *
 * Aligned with the at-* dashboard design language: hairline borders,
 * hairline-only selection chips, no glassmorphism, no neon glow.
 *
 * Layout:
 *   ┌────────────────────────────────────────────────┐
 *   │  toolbar (search · refresh)                    │
 *   ├────────────────────────────────────────────────┤
 *   │  bulk-action-bar (when rows selected)          │
 *   ├────────────────────────────────────────────────┤
 *   │  table                                         │
 *   ├────────────────────────────────────────────────┤
 *   │  pagination                                    │
 *   └────────────────────────────────────────────────┘
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from '@/lib/motion-shim';
import {
  HiSearch,
  HiEye,
  HiRefresh,
  HiCheckCircle,
  HiXCircle,
  HiChevronRight,
  HiChevronLeft,
  HiGlobe,
  HiCreditCard,
  HiAcademicCap,
  HiCash,
  HiShoppingCart,
  HiDesktopComputer,
  HiClipboardList,
  HiTemplate,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';
import { FaTelegram, FaWhatsapp } from 'react-icons/fa';
import {
  getServiceRequests,
  updateServiceRequestStatus,
  deleteServiceRequest,
  bulkUpdateServiceRequestStatus,
} from '@/actions/serviceRequestActions';
import ServiceRequestsDetailDrawer from './ServiceRequestsDetailDrawer';
import type { StatusFilter } from './ServiceRequestsCommandBar';

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

type ServiceRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const STATUS_META: Record<
  ServiceRequestStatus,
  { label: string; cls: string }
> = {
  PENDING: { label: 'در انتظار', cls: 'is-pending' },
  IN_PROGRESS: { label: 'در حال انجام', cls: 'is-progress' },
  COMPLETED: { label: 'تکمیل شده', cls: 'is-completed' },
  CANCELLED: { label: 'لغو شده', cls: 'is-cancelled' },
};

const SERVICE_META: Record<
  string,
  { label: string; Icon: typeof HiGlobe }
> = {
  INTERNATIONAL_TRANSFER: { label: 'حواله بین‌المللی',      Icon: HiGlobe },
  ONLINE_PAYMENT:         { label: 'پرداخت آنلاین',         Icon: HiCreditCard },
  TUITION_PAYMENT:        { label: 'پرداخت شهریه',          Icon: HiAcademicCap },
  FREELANCE_INCOME:       { label: 'نقد کردن درآمد',         Icon: HiCash },
  SOFTWARE_PURCHASE:      { label: 'خرید نرم‌افزار',         Icon: HiShoppingCart },
  GIFT_CARD:              { label: 'گیفت کارت',             Icon: HiTemplate },
  CURRENCY_BUY:           { label: 'خرید ارز',              Icon: HiCash },
  CURRENCY_SELL:          { label: 'فروش ارز',              Icon: HiCash },
  CRYPTO_BUY:             { label: 'خرید ارز دیجیتال',      Icon: HiDesktopComputer },
  CRYPTO_SELL:            { label: 'فروش ارز دیجیتال',      Icon: HiDesktopComputer },
  PAYPAL_TRANSFER:        { label: 'پی‌پال / اسکریل',        Icon: HiCreditCard },
  OTHER:                  { label: 'سایر',                   Icon: HiClipboardList },
};

interface ServiceRequestsTableProps {
  externalFilter: StatusFilter;
  refreshKey?: number;
  onDataChanged?: () => void;
}

export default function ServiceRequestsTable({
  externalFilter,
  refreshKey = 0,
  onDataChanged,
}: ServiceRequestsTableProps) {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const statusFilter = externalFilter;

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const result = await getServiceRequests({
      status: statusFilter,
      page,
      search,
      limit: 15,
    });
    if (result.success && result.data) {
      setRequests(result.data as ServiceRequest[]);
      setTotalPages(result.pagination?.totalPages || 1);
      setSelectedIds(new Set());
    }
    setLoading(false);
  }, [statusFilter, page, search]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests, refreshKey]);

  const handleStatusChange = async (
    id: string,
    newStatus: keyof typeof STATUS_META,
  ) => {
    const result = await updateServiceRequestStatus(id, newStatus);
    if (result.success) {
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
      fetchRequests();
      onDataChanged?.();
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteServiceRequest(id);
    if (result.success) {
      setSelectedRequest(null);
      fetchRequests();
      onDataChanged?.();
    } else {
      alert(result.message || 'خطا در حذف');
    }
  };

  const handleBulkStatus = async (status: keyof typeof STATUS_META) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const result = await bulkUpdateServiceRequestStatus(ids, status);
    if (result.success) {
      fetchRequests();
      onDataChanged?.();
    } else {
      alert(result.message || 'خطا در به‌روزرسانی گروهی');
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === requests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(requests.map((r) => r.id)));
    }
  };

  const allSelected = useMemo(
    () => requests.length > 0 && selectedIds.size === requests.length,
    [requests.length, selectedIds.size],
  );
  const someSelected = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < requests.length,
    [requests.length, selectedIds.size],
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="at-tile at-srq-table"
      >
        {/* Bulk action bar */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="at-srq-bulkbar"
            >
              <p className="at-srq-bulkbar__count">
                <strong>{selectedIds.size.toLocaleString('fa-IR')}</strong>
                مورد انتخاب شده
              </p>
              <div className="at-srq-bulkbar__actions">
                <button
                  type="button"
                  onClick={() => handleBulkStatus('IN_PROGRESS')}
                  className="at-srq-bulkbar__btn"
                >
                  <HiRefresh className="w-3.5 h-3.5" />
                  در حال انجام
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkStatus('COMPLETED')}
                  className="at-srq-bulkbar__btn"
                >
                  <HiCheckCircle className="w-3.5 h-3.5" />
                  تکمیل
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkStatus('CANCELLED')}
                  className="at-srq-bulkbar__btn is-danger"
                >
                  <HiXCircle className="w-3.5 h-3.5" />
                  لغو
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="at-srq-bulkbar__btn"
                >
                  انصراف
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter toolbar */}
        <div className="at-srq-table__filter">
          <div className="at-srq-table__search">
            <HiSearch className="at-srq-table__search-icon w-4 h-4" aria-hidden />
            <input
              type="text"
              placeholder="جستجو در کد پیگیری، نام یا شماره..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="at-srq-table__input"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              fetchRequests();
              onDataChanged?.();
            }}
            disabled={loading}
            className="at-srq-table__iconbtn"
            title="به‌روزرسانی"
            aria-label="به‌روزرسانی جدول"
          >
            <HiRefresh
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr
                style={{
                  background: 'var(--at-bg-deep)',
                  borderBlockEnd: '1px solid var(--at-line)',
                }}
              >
                <th className="px-4 py-3 w-10">
                  <CheckBox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                    ariaLabel="انتخاب همه"
                  />
                </th>
                {[
                  'کد پیگیری',
                  'مشتری',
                  'نوع خدمات',
                  'مبلغ',
                  'وضعیت',
                  'تاریخ',
                  'عملیات',
                ].map((label) => (
                  <th
                    key={label}
                    className="px-4 py-3 text-right text-[11px] font-bold text-[var(--at-fg-muted)] uppercase tracking-wider"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr
                    key={i}
                    style={{ borderBlockEnd: '1px solid var(--at-line)' }}
                  >
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div
                          className="h-3 rounded"
                          style={{
                            background: 'var(--at-bg-elevated)',
                            width: `${60 + ((i + j) % 4) * 8}%`,
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-20">
                    <div className="at-srq-empty">
                      <span className="at-srq-empty__ico">
                        <HiSearch className="w-7 h-7" />
                      </span>
                      <p className="text-sm font-semibold">
                        درخواستی یافت نشد
                      </p>
                      <p className="text-xs text-[var(--at-fg-subtle)]">
                        فیلتر یا جستجوی فعلی نتیجه‌ای ندارد.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((request) => {
                  const status =
                    STATUS_META[request.status as keyof typeof STATUS_META] ??
                    STATUS_META.PENDING;
                  const service = SERVICE_META[request.serviceType] ?? {
                    label: request.serviceType,
                    Icon: HiTemplate,
                  };
                  const ServiceIcon = service.Icon;
                  const isSelected = selectedIds.has(request.id);
                  return (
                    <motion.tr
                      key={request.id}
                      layout
                      className={`at-srq-table-row ${isSelected ? 'is-selected' : ''}`}
                      style={{ borderBlockEnd: '1px solid var(--at-line)' }}
                    >
                      <td className="px-4 py-3.5">
                        <CheckBox
                          checked={isSelected}
                          onChange={() => toggleOne(request.id)}
                          ariaLabel={`انتخاب ${request.trackingCode}`}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span className="at-srq-trackingcode">
                            {request.trackingCode}
                          </span>
                          {request.urgency === 'URGENT' && (
                            <span
                              className="at-srq-flag"
                              title="اولویت فوری"
                            >
                              <HiOutlineExclamationCircle className="w-3 h-3" />
                              فوری
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="at-srq-avatar">
                            {request.fullName.charAt(0)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[var(--at-fg)] truncate">
                              {request.fullName}
                            </p>
                            <p className="text-[11px] text-[var(--at-fg-subtle)] font-mono tabular-nums">
                              {request.phone}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <ServiceIcon className="w-3.5 h-3.5 text-[var(--at-fg-subtle)] shrink-0" />
                          <span className="text-[12.5px] text-[var(--at-fg)]">
                            {service.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-[12.5px] font-semibold text-[var(--at-fg)] tabular-nums">
                          {Number(request.amount).toLocaleString('fa-IR')}{' '}
                          <span
                            className="font-normal text-[var(--at-fg-muted)]"
                            style={{ fontSize: 11 }}
                          >
                            {request.currency}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`at-srq-status ${status.cls}`}>
                          <span className="at-srq-status__dot" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-[12px] text-[var(--at-fg-muted)] tabular-nums">
                          {new Date(request.createdAt).toLocaleDateString(
                            'fa-IR',
                            {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            },
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedRequest(request)}
                            className="at-srq-table__iconbtn"
                            title="مشاهده جزئیات"
                            aria-label="مشاهده جزئیات"
                          >
                            <HiEye className="w-4 h-4" />
                          </button>
                          <a
                            href={
                              request.contactMethod === 'telegram'
                                ? `https://t.me/${request.phone}`
                                : `https://wa.me/${request.phone.replace(/^0/, '98')}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="at-srq-table__iconbtn"
                            title="ارسال پیام"
                            aria-label="ارسال پیام"
                          >
                            {request.contactMethod === 'telegram' ? (
                              <FaTelegram className="w-4 h-4 text-[#0088cc]" />
                            ) : (
                              <FaWhatsapp className="w-4 h-4 text-[#25D366]" />
                            )}
                          </a>
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
          <div className="at-srq-pagination">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="at-srq-pagination__page"
            >
              <HiChevronRight className="w-4 h-4" />
              قبلی
            </button>
            <span className="at-srq-pagination__indicator tabular-nums">
              {page.toLocaleString('fa-IR')}
              <span>از</span>
              {totalPages.toLocaleString('fa-IR')}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="at-srq-pagination__page"
            >
              بعدی
              <HiChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>

      <ServiceRequestsDetailDrawer
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />
    </>
  );
}

function CheckBox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <label className="at-srq-check" aria-label={ariaLabel}>
      <input
        type="checkbox"
        className="at-srq-check__input"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = indeterminate ?? false;
        }}
        onChange={onChange}
      />
      <span className="at-srq-check__icon">
        {checked && !indeterminate && (
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
        {indeterminate && (
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" d="M5 12h14" />
          </svg>
        )}
      </span>
    </label>
  );
}
