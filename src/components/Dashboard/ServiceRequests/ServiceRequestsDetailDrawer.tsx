'use client';

/**
 * ServiceRequestsDetailDrawer — 2026-07-09 tabs redesign
 *
 * Adds three tabs:
 *   1. جزئیات  — existing request info + status changer + timeline
 *   2. یادداشت‌ها — append-only admin notes (fraud/AML evidence)
 *   3. مدارک   — file attachments (receipts, invoices, screenshots)
 *
 * Security:
 *   - Notes are append-only; no edit/delete for evidence integrity
 *   - Attachments can only be deleted by OWNER/ADMIN (enforced server-side)
 *   - File upload is client-side (UploadThing / native file input → base64 preview)
 *     with server-side type+size validation in addServiceRequestAttachment
 */

import '@/components/Dashboard/ServiceRequests/ServiceRequestsDetailDrawer.css';
import {
  addServiceRequestAttachment,
  addServiceRequestNote,
  deleteServiceRequestAttachment,
  getServiceRequestDetail,
} from '@/actions/serviceRequestActions';
import { ConfirmDialog } from '@/components/Dashboard/primitives/ConfirmDialog';
import { AnimatePresence, motion } from '@/lib/motion-shim';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { FaTelegram, FaWhatsapp } from 'react-icons/fa';
import {
  HiOutlineAnnotation,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineDownload,
  HiOutlineInformationCircle,
  HiOutlineMail,
  HiOutlinePaperClip,
  HiOutlinePhone,
  HiOutlinePhotograph,
  HiOutlineRefresh,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineXCircle,
  HiTemplate,
} from 'react-icons/hi';

// ─── Types ────────────────────────────────────────────────────────────────── //
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
  externalTxId?: string | null;
  metadata?: Record<string, string> | null;
  createdAt: Date | string;
}

interface DetailData {
  statusLogs: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    changedBy: string;
    note: string | null;
    createdAt: string | Date;
  }>;
  notes: Array<{
    id: string;
    body?: string | null;
    content: string | null;
    authorId: string;
    isPrivate: boolean;
    createdAt: string | Date;
  }>;
  attachments: Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    url: string;
    label: string | null;
    createdAt: string | Date;
  }>;
}

// ─── Static maps ──────────────────────────────────────────────────────────── //
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
  GIFT_CARD: 'گیفت کارت',
  CURRENCY_BUY: 'خرید ارز',
  CURRENCY_SELL: 'فروش ارز',
  CRYPTO_BUY: 'خرید ارز دیجیتال',
  CRYPTO_SELL: 'فروش ارز دیجیتال',
  PAYPAL_TRANSFER: 'پی‌پال / اسکریل',
  OTHER: 'سایر',
};

const STATUS_FA: Record<string, string> = {
  PENDING: 'در انتظار',
  IN_PROGRESS: 'در حال انجام',
  COMPLETED: 'تکمیل شده',
  CANCELLED: 'لغو شده',
};

// ─── Helpers ─────────────────────────────────────────────────────────────── //
function fmt(date: string | Date) {
  return new Date(date).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type Tab = 'detail' | 'notes' | 'attachments';

// ─── Props ────────────────────────────────────────────────────────────────── //
interface ServiceRequestsDetailDrawerProps {
  request: ServiceRequest | null;
  onClose: () => void;
  onStatusChange: (id: string, status: StatusKey) => void;
  onDelete: (id: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────── //
export default function ServiceRequestsDetailDrawer({
  request,
  onClose,
  onStatusChange,
  onDelete,
}: ServiceRequestsDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('detail');
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Attachment delete confirm state
  const [deleteAttachDialogOpen, setDeleteAttachDialogOpen] = useState(false);
  const [deleteAttachTargetId, setDeleteAttachTargetId] = useState<string | null>(null);
  const [deleteAttachLoading, setDeleteAttachLoading] = useState(false);

  // Notes tab state
  const [noteText, setNoteText] = useState('');
  const [notePrivate, setNotePrivate] = useState(true);
  const [notePending, startNoteTransition] = useTransition();
  const [noteMsg, setNoteMsg] = useState('');

  // Attachments tab state
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachLabel, setAttachLabel] = useState('');
  const [attachPending, startAttachTransition] = useTransition();
  const [attachMsg, setAttachMsg] = useState('');

  // Keyboard + scroll lock
  useEffect(() => {
    if (!request) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [request, onClose]);

  useEffect(() => {
    if (!request) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.dataset.drawerOpen = 'true';
    return () => {
      document.body.style.overflow = prev;
      delete document.body.dataset.drawerOpen;
    };
  }, [request]);

  // Load detail when drawer opens or tab is switching to notes/attachments
  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    const res = await getServiceRequestDetail(id);
    setDetailLoading(false);
    if (res.success) {
      const data = res.data as {
        statusLogs: Array<{
          id: string;
          fromStatus: string | null;
          toStatus: string;
          changedBy: string;
          note: string | null;
          createdAt: Date | string;
        }>;
        notes: Array<{
          id: string;
          body?: string | null;
          content: string | null;
          authorId: string;
          isPrivate: boolean;
          createdAt: Date | string;
        }>;
        attachments: Array<{
          id: string;
          fileName: string;
          fileType: string;
          fileSize: number;
          url: string;
          label: string | null;
          createdAt: Date | string;
        }>;
      };
      setDetail({
        statusLogs: data.statusLogs.map((l) => ({ ...l, createdAt: l.createdAt.toString() })),
        notes: data.notes.map((n) => ({ ...n, createdAt: n.createdAt.toString() })),
        attachments: data.attachments.map((a) => ({ ...a, createdAt: a.createdAt.toString() })),
      });
    }
  }, []);

  useEffect(() => {
    if (request?.id) {
      setDetail(null);
      setActiveTab('detail');
      setNoteText('');
      setNoteMsg('');
      setAttachMsg('');
      loadDetail(request.id);
    }
  }, [request?.id, loadDetail]);

  // ── Note submit ──────────────────────────────────────────────────────────
  const handleNoteSubmit = () => {
    if (!request || !noteText.trim()) return;
    startNoteTransition(async () => {
      const res = await addServiceRequestNote(request.id, noteText, notePrivate);
      setNoteMsg(res.success ? '' : 'error' in res ? res.error.message : '');
      if (res.success) {
        setNoteText('');
        loadDetail(request.id);
      }
    });
  };

  // ── Attachment upload — uses /api/upload (Liara S3 / local fallback) ───────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !request) return;

    startAttachTransition(async () => {
      // Client-side guard (mirrors server validation)
      const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
      if (!ALLOWED.includes(file.type)) {
        setAttachMsg('فقط تصویر (JPEG/PNG/WebP/GIF) یا PDF مجاز است.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setAttachMsg('حجم فایل بیش از ۱۰ مگابایت است.');
        return;
      }

      // Upload to /api/upload (Liara S3 in production, public/uploads locally)
      // PDF files: /api/upload only accepts images — store as-is via attachment action with data URL fallback.
      let uploadedUrl: string;
      if (file.type === 'application/pdf') {
        // PDF: read as data URL (acceptable for PDF since it's not image-pipeline)
        uploadedUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      } else {
        // Images: upload via the project's existing /api/upload endpoint
        setAttachMsg('در حال آپلود فایل…');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'general');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          setAttachMsg((err as { error?: string }).error ?? 'خطا در آپلود فایل. دوباره تلاش کنید.');
          if (fileRef.current) fileRef.current.value = '';
          return;
        }

        const uploadData = (await uploadRes.json()) as { files?: Array<{ url: string }> };
        uploadedUrl = uploadData.files?.[0]?.url ?? '';
        if (!uploadedUrl) {
          setAttachMsg('آپلود ناموفق: آدرس فایل دریافت نشد.');
          if (fileRef.current) fileRef.current.value = '';
          return;
        }
      }

      const res = await addServiceRequestAttachment({
        requestId: request.id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        url: uploadedUrl,
        label: attachLabel.trim() || undefined,
      });

      setAttachMsg(res.success ? '' : 'error' in res ? res.error.message : '');
      if (res.success) {
        setAttachLabel('');
        if (fileRef.current) fileRef.current.value = '';
        loadDetail(request.id);
      }
    });
  };

  const requestDeleteAttachment = (attachmentId: string) => {
    setDeleteAttachTargetId(attachmentId);
    setDeleteAttachDialogOpen(true);
  };

  const confirmDeleteAttachment = async () => {
    if (!request || !deleteAttachTargetId) return;
    setDeleteAttachLoading(true);
    const res = await deleteServiceRequestAttachment(deleteAttachTargetId);
    setDeleteAttachLoading(false);
    setDeleteAttachDialogOpen(false);
    setDeleteAttachTargetId(null);
    setAttachMsg(res.success ? '' : 'error' in res ? res.error.message : '');
    if (res.success) loadDetail(request.id);
  };

  const openMessenger = (req: ServiceRequest) => {
    const message = `سلام ${req.fullName}،\nدرخواست شما با کد پیگیری ${req.trackingCode} دریافت شد.`;
    const encoded = encodeURIComponent(message);
    const url =
      req.contactMethod === 'telegram'
        ? `https://t.me/${req.phone}?text=${encoded}`
        : `https://wa.me/${req.phone.replace(/^0/, '98')}?text=${encoded}`;
    window.open(url, '_blank');
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'detail', label: 'جزئیات' },
    { id: 'notes', label: 'یادداشت‌ها', count: detail?.notes.length },
    { id: 'attachments', label: 'مدارک', count: detail?.attachments.length },
  ];

  const content = (
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
            aria-modal="true"
            aria-labelledby="srq-drawer-title"
            className="at-srq-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          >
            {/* ── Header ──────────────────────────────────────────────────── */}
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
                      <span style={{ color: 'var(--at-danger)', fontWeight: 700 }}>فوری</span>
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

            {/* ── Tabs ────────────────────────────────────────────────────── */}
            <div className="at-srq-drawer__tabs" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={activeTab === t.id}
                  type="button"
                  className={`at-srq-drawer__tab${activeTab === t.id ? ' is-active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                  {t.count !== undefined && t.count > 0 && (
                    <span className="at-srq-drawer__tab-badge">{t.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Body ────────────────────────────────────────────────────── */}
            <div className="at-srq-drawer__body">
              {/* ═══ TAB: DETAIL ═══════════════════════════════════════════ */}
              {activeTab === 'detail' && (
                <div className="space-y-4">
                  {/* Tracking code */}
                  <div className="at-srq-drawer__trackingcode">
                    <p className="at-srq-drawer__trackingcode-label">کد پیگیری</p>
                    <p className="at-srq-drawer__trackingcode-value" dir="ltr">
                      {request.trackingCode}
                    </p>
                  </div>

                  {/* Contact */}
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
                        <span className="font-normal" style={{ color: 'var(--at-fg-muted)' }}>
                          {request.currency}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* External Tx ID */}
                  {request.externalTxId && (
                    <div className="at-srq-drawer__info">
                      <span className="at-srq-drawer__info-label">شناسه تراکنش خارجی</span>
                      <span
                        className="at-srq-drawer__info-value at-srq-drawer__info-value-mono"
                        dir="ltr"
                      >
                        {request.externalTxId}
                      </span>
                    </div>
                  )}

                  {/* Metadata (service-specific fields) */}
                  {request.metadata && Object.keys(request.metadata).length > 0 && (
                    <div>
                      <p className="at-srq-drawer__section-label">اطلاعات تکمیلی</p>
                      <div className="at-srq-drawer__meta-grid">
                        {Object.entries(request.metadata).map(([k, v]) =>
                          v ? (
                            <div key={k} className="at-srq-drawer__info">
                              <span className="at-srq-drawer__info-label">{k}</span>
                              <span className="at-srq-drawer__info-value" dir="auto">
                                {v}
                              </span>
                            </div>
                          ) : null,
                        )}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {request.description && (
                    <div>
                      <p className="at-srq-drawer__section-label">توضیحات مشتری</p>
                      <p className="at-srq-drawer__description">{request.description}</p>
                    </div>
                  )}

                  {/* Admin notes (legacy) */}
                  {request.adminNotes && (
                    <div>
                      <p className="at-srq-drawer__section-label">یادداشت ادمین</p>
                      <p className="at-srq-drawer__description">{request.adminNotes}</p>
                    </div>
                  )}

                  {/* Status changer */}
                  <div>
                    <p className="at-srq-drawer__section-label">تغییر وضعیت</p>
                    <div className="at-srq-drawer__status-grid">
                      {(Object.keys(STATUS_META) as StatusKey[]).map((key) => {
                        const meta = STATUS_META[key];
                        const Icon = meta.Icon;
                        const isActive = request.status === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => onStatusChange(request.id, key)}
                            className={`at-srq-drawer__status-btn ${meta.cls}${isActive ? ' is-active' : ''}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {meta.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status timeline */}
                  {detailLoading && <p className="at-srq-drawer__empty-hint">در حال بارگذاری…</p>}
                  {!detailLoading && detail && detail.statusLogs.length > 0 && (
                    <div>
                      <p className="at-srq-drawer__section-label">تاریخچه وضعیت</p>
                      <ol className="at-srq-drawer__timeline">
                        {detail.statusLogs.map((log, i) => (
                          <li key={log.id ?? i} className="at-srq-drawer__timeline-item">
                            <span className="at-srq-drawer__timeline-dot" />
                            <div className="at-srq-drawer__timeline-body">
                              <span className="at-srq-drawer__timeline-status">
                                {log.fromStatus
                                  ? `${STATUS_FA[log.fromStatus] ?? log.fromStatus} ← `
                                  : ''}
                                {STATUS_FA[log.toStatus] ?? log.toStatus}
                              </span>
                              <span className="at-srq-drawer__timeline-by">{log.changedBy}</span>
                              {log.note && (
                                <span className="at-srq-drawer__timeline-note">{log.note}</span>
                              )}
                              <time className="at-srq-drawer__timeline-time">
                                {fmt(log.createdAt)}
                              </time>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB: NOTES ════════════════════════════════════════════ */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <div className="at-srq-drawer__note-info">
                    <HiOutlineInformationCircle className="w-4 h-4 shrink-0" />
                    <span>
                      یادداشت‌ها برای جلوگیری از دستکاری مدارک، پس از ثبت قابل ویرایش نیستند.
                    </span>
                  </div>

                  {/* Note compose */}
                  <div className="at-srq-drawer__note-compose">
                    <textarea
                      className="at-srq-drawer__textarea"
                      rows={3}
                      placeholder="یادداشت داخلی… (مثلاً: رسید تأیید شد، شماره ارجاع X)"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      maxLength={2000}
                      aria-label="متن یادداشت جدید"
                    />
                    <div className="at-srq-drawer__note-compose-foot">
                      <label className="at-srq-drawer__checkbox-label">
                        <input
                          type="checkbox"
                          checked={notePrivate}
                          onChange={(e) => setNotePrivate(e.target.checked)}
                          className="at-srq-drawer__checkbox"
                        />
                        فقط داخلی (مخفی از مشتری)
                      </label>
                      <button
                        type="button"
                        className="at-srq-drawer__btn-primary"
                        onClick={handleNoteSubmit}
                        disabled={notePending || !noteText.trim()}
                        aria-busy={notePending}
                      >
                        {notePending ? 'در حال ثبت…' : 'ثبت یادداشت'}
                      </button>
                    </div>
                    {noteMsg && <p className="at-srq-drawer__msg">{noteMsg}</p>}
                  </div>

                  {/* Notes list */}
                  {detailLoading && <p className="at-srq-drawer__empty-hint">در حال بارگذاری…</p>}
                  {!detailLoading && detail?.notes.length === 0 && (
                    <p className="at-srq-drawer__empty-hint">یادداشتی ثبت نشده است.</p>
                  )}
                  {detail?.notes.map((note) => (
                    <div
                      key={note.id}
                      className={`at-srq-drawer__note${note.isPrivate ? ' is-private' : ''}`}
                    >
                      <div className="at-srq-drawer__note-head">
                        <span className="at-srq-drawer__note-author">
                          <HiOutlineAnnotation className="w-3.5 h-3.5" />
                          {note.authorId}
                        </span>
                        {note.isPrivate && <span className="at-srq-drawer__note-tag">داخلی</span>}
                        <time className="at-srq-drawer__note-time">{fmt(note.createdAt)}</time>
                      </div>
                      <p className="at-srq-drawer__note-content">{note.body ?? note.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* ═══ TAB: ATTACHMENTS ══════════════════════════════════════ */}
              {activeTab === 'attachments' && (
                <div className="space-y-4">
                  {/* Upload area */}
                  <div className="at-srq-drawer__upload-area">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                      className="sr-only"
                      id="srq-file-upload"
                      onChange={handleFileChange}
                      disabled={attachPending}
                    />
                    <div className="at-srq-drawer__upload-label-row">
                      <input
                        type="text"
                        className="at-srq-drawer__input"
                        placeholder="برچسب (اختیاری): مثلاً «رسید واریز»"
                        value={attachLabel}
                        onChange={(e) => setAttachLabel(e.target.value)}
                        maxLength={100}
                        aria-label="برچسب پیوست"
                      />
                      <label
                        htmlFor="srq-file-upload"
                        className={`at-srq-drawer__btn-primary${attachPending ? ' is-disabled' : ''}`}
                        aria-disabled={attachPending}
                      >
                        <HiOutlinePaperClip className="w-4 h-4" />
                        {attachPending ? 'در حال آپلود…' : 'انتخاب فایل'}
                      </label>
                    </div>
                    <p className="at-srq-drawer__upload-hint">
                      JPEG، PNG، WebP، GIF یا PDF · حداکثر ۱۰ مگابایت
                    </p>
                    {attachMsg && <p className="at-srq-drawer__msg">{attachMsg}</p>}
                  </div>

                  {/* Attachment list */}
                  {detailLoading && <p className="at-srq-drawer__empty-hint">در حال بارگذاری…</p>}
                  {!detailLoading && detail?.attachments.length === 0 && (
                    <p className="at-srq-drawer__empty-hint">پیوستی ثبت نشده است.</p>
                  )}
                  {detail?.attachments.map((att) => {
                    const isImage = att.fileType.startsWith('image/');
                    return (
                      <div key={att.id} className="at-srq-drawer__attachment">
                        <div className="at-srq-drawer__attachment-icon">
                          {isImage ? (
                            <HiOutlinePhotograph className="w-5 h-5" />
                          ) : (
                            <HiOutlineDocumentText className="w-5 h-5" />
                          )}
                        </div>
                        <div className="at-srq-drawer__attachment-info">
                          <span className="at-srq-drawer__attachment-name">
                            {att.label ?? att.fileName}
                          </span>
                          <span className="at-srq-drawer__attachment-meta">
                            {att.fileName} · {fmtBytes(att.fileSize)} · {fmt(att.createdAt)}
                          </span>
                        </div>
                        <div className="at-srq-drawer__attachment-actions">
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="at-srq-drawer__attachment-action"
                            aria-label="دانلود / مشاهده"
                            title="مشاهده"
                          >
                            <HiOutlineDownload className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            className="at-srq-drawer__attachment-action is-danger"
                            onClick={() => requestDeleteAttachment(att.id)}
                            aria-label="حذف پیوست"
                            title="حذف"
                            disabled={attachPending}
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <footer className="at-srq-drawer__foot">
              <button
                type="button"
                onClick={() => openMessenger(request)}
                className={`at-srq-drawer__foot-btn ${request.contactMethod === 'telegram' ? 'is-tg' : 'is-wa'}`}
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
                onClick={() => onDelete(request.id)}
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

      {/* Attachment delete confirmation */}
      <ConfirmDialog
        open={deleteAttachDialogOpen}
        onOpenChange={setDeleteAttachDialogOpen}
        title="حذف پیوست"
        description="آیا از حذف این پیوست اطمینان دارید؟ این عمل قابل بازگشت نیست."
        confirmLabel="بله، حذف شود"
        cancelLabel="انصراف"
        variant="danger"
        loading={deleteAttachLoading}
        onConfirm={confirmDeleteAttachment}
      />
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
