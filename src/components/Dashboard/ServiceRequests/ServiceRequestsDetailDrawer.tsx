'use client';

/**
 * ServiceRequestsDetailDrawer — 2026-07-04 redesign
 *
 * Side drawer that opens from the start edge (right in RTL) with
 * full request detail and an inline status changer. Aligned with the
 * at-* dashboard design system: hairline borders, no glassmorphism,
 * no neon glow.
 *
 * Closes on:
 *   - backdrop click
 *   - Escape key
 *   - X button
 *   - successful delete (caller closes it)
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from '@/lib/motion-shim';
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineRefresh,
  HiOutlineXCircle,
  HiOutlineTrash,
  HiOutlineX,
} from 'react-icons/hi';
import { FaTelegram, FaWhatsapp } from 'react-icons/fa';
import { HiTemplate } from 'react-icons/hi';

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
  createdAt: Date | string;
}

const STATUS_META = {
  PENDING: { label: 'در انتظار', Icon: HiOutlineClock, cls: 'is-pending' },
  IN_PROGRESS: { label: 'در حال انجام', Icon: HiOutlineRefresh, cls: 'is-progress' },
  COMPLETED: { label: 'تکمیل شده', Icon: HiOutlineCheckCircle, cls: 'is-completed' },
  CANCELLED: { label: 'لغو شده', Icon: HiOutlineXCircle, cls: 'is-cancelled' },
} as const;

type StatusKey = keyof typeof STATUS_META;

const SERVICE_LABEL: Record<string, string> = {
  INTERNATIONAL_TRANSFER: 'حواله بین‌المللی',
  ONLINE_PAYMENT: 'پرداخت آنلاین',
  TUITION_PAYMENT: 'پرداخت شهریه',
  FREELANCE_INCOME: 'نقد کردن درآمد',
  SOFTWARE_PURCHASE: 'خرید نرم‌افزار',
  OTHER: 'سایر',
};

interface ServiceRequestsDetailDrawerProps {
  request: ServiceRequest | null;
  onClose: () => void;
  onStatusChange: (id: string, status: StatusKey) => void;
  onDelete: (id: string) => void;
}

export default function ServiceRequestsDetailDrawer({
  request,
  onClose,
  onStatusChange,
  onDelete,
}: ServiceRequestsDetailDrawerProps) {
  // Escape to close
  useEffect(() => {
    if (!request) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [request, onClose]);

  // Body scroll lock while open
  useEffect(() => {
    if (!request) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [request]);

  const openMessenger = (req: ServiceRequest) => {
    const message = `سلام ${req.fullName}،\nدرخواست شما با کد پیگیری ${req.trackingCode} دریافت شد.`;
    const encoded = encodeURIComponent(message);
    const url =
      req.contactMethod === 'telegram'
        ? `https://t.me/${req.phone}?text=${encoded}`
        : `https://wa.me/${req.phone.replace(/^0/, '98')}?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <AnimatePresence>
      {request && (
        <>
          <motion.div
            key="backdrop"
            className="at-srq-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="srq-drawer-title"
            className="at-srq-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          >
            <header className="at-srq-drawer__head">
              <div className="min-w-0">
                <span className="at-srq-drawer__eyebrow">جزئیات درخواست</span>
                <h2 id="srq-drawer-title" className="at-srq-drawer__title">
                  {request.fullName}
                </h2>
                <p className="at-srq-drawer__sub">
                  ثبت شده در{' '}
                  {new Date(request.createdAt).toLocaleDateString('fa-IR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  {request.urgency === 'URGENT' && (
                    <>
                      {' · '}
                      <span
                        style={{
                          color: 'var(--at-danger)',
                          fontWeight: 700,
                        }}
                      >
                        فوری
                      </span>
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                className="at-srq-drawer__close"
                onClick={onClose}
                aria-label="بستن"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </header>

            <div className="at-srq-drawer__body">
              {/* Tracking code (focal block) */}
              <div className="at-srq-drawer__trackingcode">
                <p className="at-srq-drawer__trackingcode-label">
                  کد پیگیری
                </p>
                <p className="at-srq-drawer__trackingcode-value" dir="ltr">
                  {request.trackingCode}
                </p>
              </div>

              {/* Customer contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="at-srq-drawer__info">
                  <span className="at-srq-drawer__info-label">شماره تماس</span>
                  <span className="at-srq-drawer__info-value at-srq-drawer__info-value-mono flex items-center gap-2">
                    <HiOutlinePhone className="w-3.5 h-3.5 text-[var(--at-fg-subtle)]" />
                    <span dir="ltr">{request.phone}</span>
                  </span>
                </div>
                {request.email && (
                  <div className="at-srq-drawer__info">
                    <span className="at-srq-drawer__info-label">ایمیل</span>
                    <span className="at-srq-drawer__info-value flex items-center gap-2">
                      <HiOutlineMail className="w-3.5 h-3.5 text-[var(--at-fg-subtle)]" />
                      <span className="truncate" dir="ltr">
                        {request.email}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Service + Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="at-srq-drawer__info">
                  <span className="at-srq-drawer__info-label">نوع خدمات</span>
                  <span className="at-srq-drawer__info-value flex items-center gap-2">
                    <HiTemplate className="w-3.5 h-3.5 text-[var(--at-fg-subtle)]" />
                    {SERVICE_LABEL[request.serviceType] ?? request.serviceType}
                  </span>
                </div>
                <div className="at-srq-drawer__info">
                  <span className="at-srq-drawer__info-label">مبلغ</span>
                  <span className="at-srq-drawer__info-value at-srq-drawer__info-value-mono">
                    {Number(request.amount).toLocaleString('fa-IR')}{' '}
                    <span
                      className="font-normal"
                      style={{ color: 'var(--at-fg-muted)' }}
                    >
                      {request.currency}
                    </span>
                  </span>
                </div>
              </div>

              {/* Description */}
              {request.description && (
                <div>
                  <p className="at-srq-drawer__section-label">توضیحات مشتری</p>
                  <p className="at-srq-drawer__description">
                    {request.description}
                  </p>
                </div>
              )}

              {/* Status changer */}
              <div>
                <p className="at-srq-drawer__section-label">تغییر وضعیت</p>
                <div className="at-srq-drawer__status-grid">
                  {(Object.keys(STATUS_META) as Array<StatusKey>).map((key) => {
                    const meta = STATUS_META[key];
                    const Icon = meta.Icon;
                    const isActive = request.status === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onStatusChange(request.id, key)}
                        className={`at-srq-drawer__status-btn ${meta.cls} ${
                          isActive ? 'is-active' : ''
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <footer className="at-srq-drawer__foot">
              <button
                type="button"
                onClick={() => openMessenger(request)}
                className={`at-srq-drawer__foot-btn ${
                  request.contactMethod === 'telegram' ? 'is-tg' : 'is-wa'
                }`}
              >
                {request.contactMethod === 'telegram' ? (
                  <FaTelegram className="w-4 h-4" />
                ) : (
                  <FaWhatsapp className="w-4 h-4" />
                )}
                ارسال پیام
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('آیا از حذف این درخواست اطمینان دارید؟')) {
                    onDelete(request.id);
                  }
                }}
                className="at-srq-drawer__foot-danger"
                title="حذف"
                aria-label="حذف درخواست"
              >
                <HiOutlineTrash className="w-4 h-4" />
              </button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
