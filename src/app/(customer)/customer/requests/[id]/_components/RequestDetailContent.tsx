'use client';

/**
 * RequestDetailContent — جزئیات یک درخواست با timeline و اقدام
 * -----------------------------------------------------------------------------
 * ساختار:
 *  §1. STATUS HERO     — Status banner بزرگ با rail + icon + اقدام
 *  §2. INFO GRID       — ۲ ستونه: نوع، کد، صرافی، زمان ایجاد و بروزرسانی
 *  §3. PAYLOAD TABLE   — اگر payload وجود داشته باشد، کلید/مقدارها
 *  §4. TIMELINE        — تاریخچه تغییر status با rail
 *  §5. NOTE            — یادداشت کاربر
 *  §6. RESOLUTION      — پاسخ صرافی (اگر بسته شده)
 *  §7. ACTIONS         — دکمه لغو (اگر pending)
 */

import { type CustomerRequestDetail, cancelCustomerRequest } from '@/actions/customer-portal';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import {
  faDateTimeFull,
  faNum,
} from '@/app/(customer)/customer/_lib/customer-formatters';
import {
  StatusDot,
  StatusPill,
  type StatusVariant,
} from '@/app/(customer)/customer/_lib/customer-ui';
import {
  AlertTriangle,
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  FileText,
  Gauge,
  Hash,
  Loader2,
  Lock,
  MessageSquare,
  Send,
  ShieldCheck,
  Wallet,
  XCircle,
  XIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import s from './RequestDetailContent.module.css';

interface Props {
  detail: CustomerRequestDetail;
}

const STATUS_VARIANT: Record<string, StatusVariant> = {
  PENDING: 'pending',
  IN_REVIEW: 'progress',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'cancelled',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'در انتظار بررسی',
  IN_REVIEW: 'در حال بررسی',
  APPROVED: 'تأیید شده',
  REJECTED: 'رد شده',
  CANCELLED: 'لغو شده',
};

const STATUS_DESC: Record<string, string> = {
  PENDING: 'درخواست شما ثبت شده و در صف بررسی صرافی قرار دارد. معمولاً کمتر از ۲۴ ساعت طول می‌کشد.',
  IN_REVIEW: 'کارشناسان صرافی در حال بررسی درخواست شما هستند. به‌زودی نتیجه اعلام می‌شود.',
  APPROVED: 'درخواست شما تأیید شد. اقدامات لازم توسط صرافی انجام شده است.',
  REJECTED: 'متأسفانه درخواست شما رد شد. می‌توانید با صرافی تماس بگیرید یا درخواست جدید ثبت کنید.',
  CANCELLED: 'این درخواست توسط شما لغو شده است.',
};

const STATUS_ICON: Record<string, typeof Clock> = {
  PENDING: Clock,
  IN_REVIEW: Loader2,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  CANCELLED: AlertTriangle,
};

// ─── Component ──────────────────────────────────────────────────────────── //

export default function RequestDetailContent({ detail }: Props) {
  const router = useRouter();
  const [isCancelling, startCancel] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const variant = STATUS_VARIANT[detail.status] ?? 'neutral';
  const StatusIcon = STATUS_ICON[detail.status] ?? Clock;
  const isCancellable = detail.status === 'PENDING' || detail.status === 'IN_REVIEW';

  function handleCancel() {
    startCancel(async () => {
      const res = await cancelCustomerRequest(detail.id);
      if (!res.success) {
        toast({ variant: 'destructive', title: res.error ?? 'خطا در لغو درخواست' });
        setConfirmOpen(false);
        return;
      }
      toast({ title: 'درخواست لغو شد' });
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <div className={s.root} dir="rtl">
      {/* ═════════════════════════════════════════════════════════════════
          §1. STATUS HERO
          ═════════════════════════════════════════════════════════════════ */}
      <section className={s.statusHero} data-status={detail.status}>
        <span className={s.statusRail} aria-hidden />
        <div className={s.statusIcon} data-status={detail.status}>
          <StatusIcon size={20} />
        </div>
        <div className={s.statusBody}>
          <div className={s.statusTopRow}>
            <span className={s.statusLabel}>وضعیت</span>
            <StatusPill variant={variant}>{STATUS_LABEL[detail.status] ?? detail.status}</StatusPill>
          </div>
          <h2 className={s.statusTitle}>{detail.typeLabel}</h2>
          <p className={s.statusDesc}>{STATUS_DESC[detail.status] ?? ''}</p>
          <div className={s.statusFoot}>
            <code className={s.trackingCode}>
              <Hash size={11} aria-hidden /> {detail.trackingCode}
            </code>
            {detail.reviewedAt && (
              <span className={s.statusMeta}>
                بررسی شده در {faDateTimeFull(detail.reviewedAt)}
              </span>
            )}
          </div>
        </div>

        {isCancellable && (
          <div className={s.statusActions}>
            {!confirmOpen ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmOpen(true)}
                className={s.cancelBtn}
              >
                <XIcon size={11} aria-hidden />
                لغو درخواست
              </Button>
            ) : (
              <div className={s.confirmRow} role="alertdialog" aria-label="تأیید لغو">
                <span>مطمئنید؟</span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isCancelling}
                >
                  {isCancelling ? <Loader2 size={11} className={s.spinner} /> : 'بله، لغو شود'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmOpen(false)}
                  disabled={isCancelling}
                >
                  انصراف
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          §2. INFO GRID
          ═════════════════════════════════════════════════════════════════ */}
      <section className={s.infoGrid} aria-label="اطلاعات درخواست">
        <InfoRow icon={FileText} label="نوع درخواست" value={detail.typeLabel} />
        <InfoRow
          icon={Building2}
          label="صرافی مقصد"
          value={detail.exchange.name}
        />
        <InfoRow
          icon={Clock}
          label="زمان ثبت"
          value={faDateTimeFull(detail.createdAt)}
        />
        <InfoRow
          icon={Clock}
          label="آخرین بروزرسانی"
          value={faDateTimeFull(detail.updatedAt)}
        />
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          §3. PAYLOAD TABLE
          ═════════════════════════════════════════════════════════════════ */}
      {detail.payload && Object.keys(detail.payload).length > 0 && (
        <section className={s.section} aria-label="جزئیات درخواست">
          <header className={s.sectionHead}>
            <FileText size={12} aria-hidden />
            <h3 className={s.sectionTitle}>جزئیات</h3>
          </header>
          <dl className={s.payloadList}>
            {Object.entries(detail.payload).map(([key, value]) => (
              <div key={key} className={s.payloadRow}>
                <dt className={s.payloadKey}>{translatePayloadKey(key)}</dt>
                <dd className={s.payloadValue}>{formatPayloadValue(key, value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          §5. NOTE (user)
          ═════════════════════════════════════════════════════════════════ */}
      {detail.note && (
        <section className={s.section} aria-label="یادداشت شما">
          <header className={s.sectionHead}>
            <MessageSquare size={12} aria-hidden />
            <h3 className={s.sectionTitle}>یادداشت شما</h3>
          </header>
          <p className={s.noteText}>{detail.note}</p>
        </section>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          §6. RESOLUTION (exchange reply)
          ═════════════════════════════════════════════════════════════════ */}
      {detail.resolution && (
        <section className={s.section} data-tone="resolution" aria-label="پاسخ صرافی">
          <header className={s.sectionHead}>
            <Building2 size={12} aria-hidden />
            <h3 className={s.sectionTitle}>پاسخ صرافی</h3>
          </header>
          <p className={s.resolutionText}>{detail.resolution}</p>
        </section>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          §4. TIMELINE
          ═════════════════════════════════════════════════════════════════ */}
      <section className={s.timelineSection} aria-label="تاریخچه">
        <header className={s.sectionHead}>
          <ArrowLeftRight size={12} aria-hidden />
          <h3 className={s.sectionTitle}>تاریخچه</h3>
          <span className={s.timelineCount}>
            {faNum(detail.statusLogs.length)} رویداد
          </span>
        </header>

        <ol className={s.timeline}>
          {detail.statusLogs.map((log, i) => {
            const v = STATUS_VARIANT[log.toStatus] ?? 'neutral';
            const isFirst = i === 0;
            const isLast = i === detail.statusLogs.length - 1;
            return (
              <li
                key={log.id}
                className={s.timelineItem}
                data-active={isLast ? 'true' : undefined}
              >
                <span className={s.timelineRail} aria-hidden />
                <span className={s.timelineNode} data-status={log.toStatus} aria-hidden>
                  <StatusDot variant={v} pulse={isLast} />
                </span>
                <div className={s.timelineBody}>
                  <div className={s.timelineTopRow}>
                    <StatusPill variant={v}>
                      {STATUS_LABEL[log.toStatus] ?? log.toStatus}
                    </StatusPill>
                    {log.fromStatus && (
                      <span className={s.timelineFrom}>
                        از «{STATUS_LABEL[log.fromStatus] ?? log.fromStatus}»
                      </span>
                    )}
                    {!log.fromStatus && isFirst && (
                      <span className={s.timelineFrom}>ایجاد درخواست</span>
                    )}
                  </div>
                  {log.note && <p className={s.timelineNote}>{log.note}</p>}
                  <time
                    className={s.timelineDate}
                    dateTime={new Date(log.createdAt).toISOString()}
                    title={faDateTimeFull(log.createdAt)}
                  >
                    {faDateTimeFull(log.createdAt)}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className={s.backRow}>
        <Link href="/customer/requests" className={s.backLink}>
          بازگشت به لیست درخواست‌ها
        </Link>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────── //

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className={s.infoRow}>
      <span className={s.infoIcon} aria-hidden>
        <Icon size={11} />
      </span>
      <div className={s.infoText}>
        <span className={s.infoLabel}>{label}</span>
        <span className={s.infoValue}>{value}</span>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────── //

const PAYLOAD_KEY_LABEL: Record<string, string> = {
  accountType: 'نوع حساب',
  currency: 'ارز',
  label: 'برچسب',
  fromAccountId: 'از حساب',
  toAccountId: 'به شناسه',
  amount: 'مبلغ',
  accountId: 'شناسه حساب',
  requestedLimitAf: 'سقف پیشنهادی (AFN)',
};

function translatePayloadKey(key: string): string {
  return PAYLOAD_KEY_LABEL[key] ?? key;
}

function formatPayloadValue(_key: string, value: string | number): string {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(value);
  }
  return String(value);
}
