'use client';

/**
 * ServiceRequestsTable — 2026-07-04 redesign · 2026-07-28 QA pass
 *
 * Aligned with the at-* dashboard design language: hairline borders,
 * hairline-only selection chips, no glassmorphism, no neon glow.
 *
 * 2026-07-28 improvements:
 *   - Replace native alert() with ConfirmDialog (primitives)
 *   - Add total row count to pagination footer
 *   - Improve skeleton rows proportions
 *   - Add hover translateY micro-interaction on rows
 *   - Improve CheckBox indeterminate visual (dash line)
 *   - Empty state: contextual icon (filter vs empty)
 *   - Stagger animation on initial load rows
 *
 * Layout:
 *   ┌────────────────────────────────────────────────┐
 *   │  toolbar (search · refresh · count badge)      │
 *   ├────────────────────────────────────────────────┤
 *   │  bulk-action-bar (when rows selected)          │
 *   ├────────────────────────────────────────────────┤
 *   │  table                                         │
 *   ├────────────────────────────────────────────────┤
 *   │  pagination  (prev · page/total · next)        │
 *   └────────────────────────────────────────────────┘
 */

import '@/components/Dashboard/ServiceRequests/ServiceRequestsTable.css';
import {
  bulkUpdateServiceRequestStatus,
  deleteServiceRequest,
  getServiceRequests,
  updateServiceRequestStatus,
} from '@/actions/serviceRequestActions';
import { MillionDollarEmpty } from '@/components/Dashboard/primitives';
import { ConfirmDialog } from '@/components/Dashboard/primitives/ConfirmDialog';
import { Checkbox as UICheckbox } from '@/components/ui/checkbox';
import { AnimatePresence, motion } from '@/lib/motion-shim';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { FaTelegram, FaWhatsapp } from 'react-icons/fa';
import {
  HiAcademicCap,
  HiCash,
  HiCheckCircle,
  HiChevronLeft,
  HiChevronRight,
  HiClipboardList,
  HiCreditCard,
  HiDesktopComputer,
  HiDeviceMobile,
  HiEye,
  HiGlobe,
  HiOutlineAnnotation,
  HiOutlineExclamationCircle,
  HiOutlinePaperClip,
  HiRefresh,
  HiSearch,
  HiShoppingCart,
  HiTemplate,
  HiXCircle,
} from 'react-icons/hi';
import type { StatusFilter } from './ServiceRequestsCommandBar';
import ServiceRequestsDetailDrawer from './ServiceRequestsDetailDrawer';

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
  _count?: { notes: number; attachments: number };
}

type ServiceRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

const STATUS_META: Record<ServiceRequestStatus, { label: string; cls: string }> = {
  PENDING: { label: 'در انتظار', cls: 'is-pending' },
  IN_PROGRESS: { label: 'در حال انجام', cls: 'is-progress' },
  COMPLETED: { label: 'تکمیل شده', cls: 'is-completed' },
  CANCELLED: { label: 'لغو شده', cls: 'is-cancelled' },
  EXPIRED: { label: 'منقضی', cls: 'is-cancelled' },
};

const SERVICE_META: Record<string, { label: string; Icon: typeof HiGlobe }> = {
  INTERNATIONAL_TRANSFER: { label: 'حواله بین‌المللی', Icon: HiGlobe },
  ONLINE_PAYMENT: { label: 'پرداخت آنلاین', Icon: HiCreditCard },
  TUITION_PAYMENT: { label: 'پرداخت شهریه', Icon: HiAcademicCap },
  FREELANCE_INCOME: { label: 'نقد کردن درآمد', Icon: HiCash },
  SOFTWARE_PURCHASE: { label: 'خرید نرم‌افزار', Icon: HiShoppingCart },
  GIFT_CARD: { label: 'گیفت کارت', Icon: HiTemplate },
  CURRENCY_BUY: { label: 'خرید ارز', Icon: HiCash },
  CURRENCY_SELL: { label: 'فروش ارز', Icon: HiCash },
  CRYPTO_BUY: { label: 'خرید ارز دیجیتال', Icon: HiDesktopComputer },
  CRYPTO_SELL: { label: 'فروش ارز دیجیتال', Icon: HiDesktopComputer },
  PAYPAL_TRANSFER: { label: 'پی‌پال / اسکریل', Icon: HiCreditCard },
  MOBILE_TOPUP: { label: 'شارژ موبایل', Icon: HiDeviceMobile },
  BILL_PAYMENT: { label: 'پرداخت قبض', Icon: HiClipboardList },
  OTHER: { label: 'سایر', Icon: HiClipboardList },
};

interface ServiceRequestsTableProps {
  externalFilter: StatusFilter;
  refreshKey?: number;
  onDataChanged?: () => void;
}

/** Skeleton loader rows — static widths give a realistic shimmer pattern */
function SkeletonRows() {
  // Width patterns per column: trackingCode, customer, service, amount, status, date, actions
  const colWidths = [
    ['60%', '45%'], // tracking code + badge
    ['70%', '50%'], // name + phone
    ['65%', ''], // service
    ['55%', ''], // amount
    ['75%', ''], // status pill
    ['50%', ''], // date
    ['40%', ''], // actions
  ];
  return (
    <>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <tr key={`sk-r-${i}`} style={{ borderBlockEnd: '1px solid var(--at-line)' }}>
          {/* checkbox */}
          <td className="px-4 py-4 w-10">
            <div
              className="rounded"
              style={{
                width: 16,
                height: 16,
                background: 'var(--at-bg-elevated)',
              }}
            />
          </td>
          {colWidths.map((widths, j) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static and never reordered
            <td key={`sk-c-${i}-${j}`} className="px-4 py-4">
              <div className="flex flex-col gap-1.5">
                <div
                  className="h-3 rounded"
                  style={{
                    background: 'var(--at-bg-elevated)',
                    width: widths[0],
                    opacity: 0.7 + (i % 3) * 0.1,
                  }}
                />
                {widths[1] && (
                  <div
                    className="h-2.5 rounded"
                    style={{
                      background: 'var(--at-bg-elevated)',
                      width: widths[1],
                      opacity: 0.5,
                    }}
                  />
                )}
              </div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function ServiceRequestsTable({
  externalFilter,
  refreshKey = 0,
  onDataChanged,
}: ServiceRequestsTableProps) {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ConfirmDialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bulkErrorMsg, setBulkErrorMsg] = useState<string | null>(null);
  const [bulkErrorOpen, setBulkErrorOpen] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);
  const [bulkSuccessOpen, setBulkSuccessOpen] = useState(false);

  const statusFilter = externalFilter;

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const result = await getServiceRequests({
      status: statusFilter,
      page,
      search,
      limit: 15,
    });
    if (result.success && result.data) {
      const data = result.data as unknown as {
        data: ServiceRequest[];
        pagination: { totalPages: number; total: number };
      };
      setRequests(data.data ?? []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
      setSelectedIds(new Set());
    } else if (!result.success) {
      setFetchError('error' in result ? result.error.message : 'خطا در بارگذاری درخواست‌ها');
    }
    setLoading(false);
  }, [statusFilter, page, search]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is an intentional external signal prop
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests, refreshKey]);

  const handleStatusChange = async (id: string, newStatus: keyof typeof STATUS_META) => {
    const result = await updateServiceRequestStatus(id, newStatus);
    if (result.success) {
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
      fetchRequests();
      onDataChanged?.();
    } else {
      // 2026-08-16: گارد ماشین وضعیت — انتقال غیرمجاز به کارشناس نشان داده می‌شود
      setBulkErrorMsg('error' in result ? result.error.message : 'تغییر وضعیت ناموفق بود');
      setBulkErrorOpen(true);
    }
  };

  /** Opens confirmation dialog before delete */
  const requestDelete = (id: string) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleteLoading(true);
    const result = await deleteServiceRequest(deleteTargetId);
    setDeleteLoading(false);
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
    if (result.success) {
      setSelectedRequest(null);
      fetchRequests();
      onDataChanged?.();
    } else {
      setBulkErrorMsg('error' in result ? result.error.message : 'خطا در حذف درخواست');
      setBulkErrorOpen(true);
    }
  };

  const handleBulkStatus = async (status: keyof typeof STATUS_META) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const count = ids.length;
    const result = await bulkUpdateServiceRequestStatus(ids, status);
    if (result.success) {
      setBulkSuccessMsg(`${count} درخواست با موفقیت به‌روز شد`);
      setBulkSuccessOpen(true);
      fetchRequests();
      onDataChanged?.();
    } else {
      setBulkErrorMsg('error' in result ? result.error.message : 'خطا در به‌روزرسانی گروهی');
      setBulkErrorOpen(true);
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

  const hasSearch = search.trim().length > 0;

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

        {/* Fetch error state */}
        {fetchError && !loading && (
          <div
            role="alert"
            className="mx-4 mt-3 flex items-center gap-3 rounded-md border border-[var(--at-danger-line,#fca5a5)] bg-[var(--at-danger-bg,#fff1f2)] px-4 py-3 text-sm text-[var(--at-danger,#dc2626)]"
          >
            <HiXCircle className="w-4 h-4 shrink-0" aria-hidden />
            <span>{fetchError}</span>
            <button
              type="button"
              onClick={fetchRequests}
              className="ms-auto text-xs underline opacity-80 hover:opacity-100"
            >
              تلاش مجدد
            </button>
          </div>
        )}

        {/* Filter toolbar */}
        <div className="at-srq-table__filter">
          <div className="at-srq-table__search">
            <HiSearch className="at-srq-table__search-icon w-4 h-4" aria-hidden />
            <input
              type="text"
              placeholder="جستجو در کد پیگیری، نام یا شماره…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="at-srq-table__input"
              aria-label="جستجو در درخواست‌ها"
            />
          </div>
          {/* Total count badge */}
          {!loading && totalCount > 0 && (
            <span className="at-srq-table__count-badge" aria-live="polite">
              {totalCount.toLocaleString('fa-IR')} مورد
            </span>
          )}
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
            <HiRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full" aria-label="جدول درخواست‌های خدمات">
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
                {(
                  [
                    { label: 'کد پیگیری', cls: '' },
                    { label: 'مشتری', cls: '' },
                    { label: 'نوع خدمات', cls: '' },
                    { label: 'مبلغ', cls: 'hidden md:table-cell' },
                    { label: 'وضعیت', cls: '' },
                    { label: 'تاریخ', cls: 'hidden md:table-cell' },
                    { label: 'عملیات', cls: '' },
                  ] as Array<{ label: string; cls: string }>
                ).map(({ label, cls }) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-right text-[11px] font-bold text-[var(--at-fg-muted)] uppercase tracking-wider${cls ? ` ${cls}` : ''}`}
                    scope="col"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12">
                    <MillionDollarEmpty
                      variant={hasSearch ? 'search' : 'inbox'}
                      eyebrow={hasSearch ? 'نتیجه جستجو' : 'مرکز درخواست‌ها'}
                      title={hasSearch ? 'نتیجه‌ای یافت نشد' : 'درخواستی ثبت نشده'}
                      description={
                        hasSearch
                          ? 'عبارت جستجو یا فیلتر فعلی نتیجه‌ای ندارد.'
                          : 'هنوز هیچ درخواست خدماتی دریافت نشده است.'
                      }
                    />
                  </td>
                </tr>
              ) : (
                requests.map((request, idx) => {
                  const status =
                    STATUS_META[request.status as keyof typeof STATUS_META] ?? STATUS_META.PENDING;
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
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
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
                          <span className="at-srq-trackingcode">{request.trackingCode}</span>
                          {request.urgency === 'URGENT' && (
                            <span className="at-srq-flag" title="اولویت فوری">
                              <HiOutlineExclamationCircle className="w-3 h-3" />
                              فوری
                            </span>
                          )}
                          {/* notes + attachments badges */}
                          {(request._count?.notes ?? 0) > 0 && (
                            <span
                              className="at-srq-badge"
                              title={`${request._count?.notes} یادداشت`}
                              aria-label={`${request._count?.notes} یادداشت`}
                            >
                              <HiOutlineAnnotation className="w-3 h-3" />
                              {request._count?.notes}
                            </span>
                          )}
                          {(request._count?.attachments ?? 0) > 0 && (
                            <span
                              className="at-srq-badge is-attach"
                              title={`${request._count?.attachments} پیوست`}
                              aria-label={`${request._count?.attachments} پیوست`}
                            >
                              <HiOutlinePaperClip className="w-3 h-3" />
                              {request._count?.attachments}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="at-srq-avatar"
                            data-persona={request.fullName.charCodeAt(0) % 5}
                            aria-hidden="true"
                          >
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
                          <ServiceIcon
                            className="w-3.5 h-3.5 text-[var(--at-fg-subtle)] shrink-0"
                            aria-hidden
                          />
                          <span className="text-[12.5px] text-[var(--at-fg)]">{service.label}</span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3.5 whitespace-nowrap">
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
                      <td className="hidden md:table-cell px-4 py-3.5 whitespace-nowrap">
                        <span className="text-[12px] text-[var(--at-fg-muted)] tabular-nums">
                          {new Date(request.createdAt).toLocaleDateString('fa-IR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedRequest(request)}
                            className="at-srq-table__iconbtn"
                            title="مشاهده جزئیات"
                            aria-label={`مشاهده جزئیات ${request.trackingCode}`}
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
                            aria-label={`ارسال پیام به ${request.fullName}`}
                          >
                            {request.contactMethod === 'telegram' ? (
                              <FaTelegram
                                className="w-4 h-4"
                                style={{ color: 'var(--at-telegram)' }}
                              />
                            ) : (
                              <FaWhatsapp
                                className="w-4 h-4"
                                style={{ color: 'var(--at-whatsapp)' }}
                              />
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
              aria-label="صفحه قبلی"
            >
              <HiChevronRight className="w-4 h-4" />
              قبلی
            </button>
            <span className="at-srq-pagination__indicator tabular-nums" aria-live="polite">
              صفحه {page.toLocaleString('fa-IR')}
              <span className="at-srq-pagination__indicator-sep">از</span>
              {totalPages.toLocaleString('fa-IR')}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="at-srq-pagination__page"
              aria-label="صفحه بعدی"
            >
              بعدی
              <HiChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>

      {/* Detail drawer */}
      <ServiceRequestsDetailDrawer
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onStatusChange={handleStatusChange}
        onDelete={requestDelete}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="حذف درخواست"
        description="آیا از حذف این درخواست اطمینان دارید؟ این عمل قابل بازگشت نیست."
        confirmLabel="بله، حذف شود"
        cancelLabel="انصراف"
        variant="danger"
        loading={deleteLoading}
        onConfirm={confirmDelete}
      />

      {/* Bulk operation error dialog */}
      <ConfirmDialog
        open={bulkErrorOpen}
        onOpenChange={setBulkErrorOpen}
        title="خطا در عملیات"
        description={bulkErrorMsg ?? 'یک خطا رخ داده است.'}
        confirmLabel="باشه"
        cancelLabel=""
        variant="default"
        onConfirm={() => setBulkErrorOpen(false)}
      />

      {/* Bulk operation success dialog */}
      <ConfirmDialog
        open={bulkSuccessOpen}
        onOpenChange={setBulkSuccessOpen}
        title="عملیات موفق"
        description={bulkSuccessMsg ?? 'به‌روزرسانی با موفقیت انجام شد.'}
        confirmLabel="باشه"
        cancelLabel=""
        variant="default"
        onConfirm={() => setBulkSuccessOpen(false)}
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
  const id = useId();
  return (
    <label htmlFor={id} className="at-srq-check" aria-label={ariaLabel}>
      <UICheckbox
        id={id}
        checked={indeterminate ? 'indeterminate' : checked}
        onCheckedChange={onChange}
      />
    </label>
  );
}
