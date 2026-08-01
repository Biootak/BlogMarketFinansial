'use client';

/**
 * ExchangeKycReviewClient — صف KYC مشتریان صرافی (پنل صراف)
 *
 * FIX (2026-08-01): صراف قبلاً راهی برای تأیید/رد KYC مشتریان خودش نداشت —
 * reviewCustomerKycRecord فقط در kyc-review ادمین پلتفرم وصل بود و صراف از
 * /dashboard بلاک است. این component صف KYC صرافی خودش را با tenant isolation
 * نمایش می‌دهد و اجازهٔ تأیید/رد می‌دهد (canWrite → OWNER/MANAGER/STAFF).
 *
 * Design: هماهنگ با nova tokens — KPI strip + table + sheet preview + reject dialog.
 * States: loading / empty / error / success / disabled.
 */

import { reviewCustomerKycRecord } from '@/actions/customer-portal';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Eye, FileText, Lock, ShieldCheck, XCircle } from 'lucide-react';
import Image from 'next/image';
import type { CSSProperties } from 'react';
import { useCallback, useMemo, useState, useTransition } from 'react';
import s from './ExchangeKycReviewClient.module.css';

export type ExchangeKycRow = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  docType: string;
  docNumber: string | null;
  fileUrl: string | null;
  level: string;
  createdAt: string;
};

interface Props {
  records: ExchangeKycRow[];
  canWrite: boolean;
  exchangeName: string;
}

const DOC_TYPE_LABEL: Record<string, string> = {
  NATIONAL_ID: 'تذکره / ملی',
  PASSPORT: 'پاسپورت',
  RESIDENCE_PERMIT: 'اجازه اقامت',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return name.slice(0, 2) || '؟';
}

function nameHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h) % 360;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DocImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className={s.imgFallback} aria-label={alt}>
        <FileText size={28} aria-hidden />
        <span>بارگذاری ناموفق</span>
      </div>
    );
  }
  return (
    <div className={s.docImgWrap}>
      <Image
        src={src}
        alt={alt}
        fill
        className={s.docImg}
        onError={() => setError(true)}
        unoptimized
        sizes="(max-width: 768px) 100vw, 500px"
      />
    </div>
  );
}

export function ExchangeKycReviewClient({ records: initial, canWrite, exchangeName }: Props) {
  const [rows, setRows] = useState<ExchangeKycRow[]>(initial);
  const [preview, setPreview] = useState<ExchangeKycRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ExchangeKycRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const cooldownTick = useCallback(() => {
    setCooldown(1);
    setTimeout(() => setCooldown(0), 800);
  }, []);

  const actionLocked = cooldown > 0 || isPending;

  const kpi = useMemo(
    () => ({
      total: rows.length,
      idCard: rows.filter((r) => r.docType === 'NATIONAL_ID').length,
      urgent: rows.filter(
        (r) => Date.now() - new Date(r.createdAt).getTime() > 2 * 24 * 60 * 60 * 1000,
      ).length,
    }),
    [rows],
  );

  const approve = useCallback(
    (row: ExchangeKycRow) => {
      if (actionLocked) return;
      cooldownTick();
      // optimistic
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setPreview((prev) => (prev?.id === row.id ? null : prev));
      setError(null);
      setLastAction(null);
      startTransition(async () => {
        const res = await reviewCustomerKycRecord({ recordId: row.id, approved: true });
        if (!res.success) {
          setRows((prev) => [row, ...prev]);
          setError(res.error ?? 'خطا در تأیید');
          return;
        }
        setLastAction(`KYC «${row.customerName}» تأیید شد`);
      });
    },
    [actionLocked, cooldownTick],
  );

  const confirmReject = useCallback(() => {
    if (!rejectTarget || actionLocked) return;
    cooldownTick();
    const target = rejectTarget;
    const reason = rejectReason.trim() || 'مدارک ناقص یا ناخوانا';
    setRejectTarget(null);
    setRejectReason('');
    setRows((prev) => prev.filter((r) => r.id !== target.id));
    setPreview((prev) => (prev?.id === target.id ? null : prev));
    setError(null);
    setLastAction(null);
    startTransition(async () => {
      const res = await reviewCustomerKycRecord({
        recordId: target.id,
        approved: false,
        rejectedReason: reason,
      });
      if (!res.success) {
        setRows((prev) => [target, ...prev]);
        setError(res.error ?? 'خطا در رد');
        return;
      }
      setLastAction(`KYC «${target.customerName}» رد شد`);
    });
  }, [rejectTarget, rejectReason, actionLocked, cooldownTick]);

  return (
    <div className={s.root} dir="rtl">
      {/* ── KPI strip ─────────────────────────────────────────────── */}
      <div className={s.kpiStrip} aria-label="خلاصه صف KYC">
        <div className={s.kpiCard} style={{ '--kpi-accent': 'var(--nova-amber)' } as CSSProperties}>
          <span className={s.kpiLabel}>در انتظار بررسی</span>
          <span className={s.kpiValue}>{new Intl.NumberFormat('fa-IR').format(kpi.total)}</span>
          <span className={s.kpiSub}>{exchangeName}</span>
        </div>
        <div
          className={s.kpiCard}
          style={{ '--kpi-accent': 'var(--nova-violet)' } as CSSProperties}
        >
          <span className={s.kpiLabel}>تذکره / کارت ملی</span>
          <span className={s.kpiValue}>{new Intl.NumberFormat('fa-IR').format(kpi.idCard)}</span>
          <span className={s.kpiSub}>سهم از صف</span>
        </div>
        <div className={s.kpiCard} style={{ '--kpi-accent': 'var(--nova-rose)' } as CSSProperties}>
          <span className={s.kpiLabel}>فوری (بیش از ۲ روز)</span>
          <span className={s.kpiValue}>{new Intl.NumberFormat('fa-IR').format(kpi.urgent)}</span>
          <span className={s.kpiSub}>اولویت رسیدگی</span>
        </div>
      </div>

      {/* ── Notices ───────────────────────────────────────────────── */}
      {lastAction && (
        <output className={cn(s.banner, s.bannerSuccess)} aria-live="polite">
          <CheckCircle2 size={15} aria-hidden />
          {lastAction}
        </output>
      )}
      {error && (
        <div className={cn(s.banner, s.bannerError)} role="alert">
          <AlertCircle size={15} aria-hidden />
          {error}
        </div>
      )}
      {!canWrite && (
        <output className={s.readOnlyNote}>
          <Lock size={14} aria-hidden />
          شما دسترسی خواندنی دارید — تأیید/رد توسط OWNER یا MANAGER صرافی انجام می‌شود.
        </output>
      )}

      {/* ── Empty / Table ─────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className={s.emptyWrap}>
          <span className={s.emptyIcon} aria-hidden>
            <ShieldCheck size={26} />
          </span>
          <h2 className={s.emptyTitle}>صف KYC خالی است</h2>
          <p className={s.emptyDesc}>
            هیچ درخواست احراز هویتی در انتظار بررسی نیست. به‌محض اینکه مشتری مدارک ارسال کند، اینجا
            نمایش داده می‌شود.
          </p>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table} aria-label="صف بررسی KYC">
            <thead>
              <tr>
                <th className={s.th} scope="col">
                  مشتری
                </th>
                <th className={s.th} scope="col">
                  نوع مدرک
                </th>
                <th className={s.th} scope="col">
                  شماره
                </th>
                <th className={s.th} scope="col">
                  سطح
                </th>
                <th className={s.th} scope="col">
                  تاریخ ارسال
                </th>
                <th className={s.th} scope="col">
                  <span className="sr-only">عملیات</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const hue = nameHue(row.customerName);
                const urgent =
                  Date.now() - new Date(row.createdAt).getTime() > 2 * 24 * 60 * 60 * 1000;
                return (
                  <tr key={row.id} className={s.tr} style={{ '--row-i': i } as CSSProperties}>
                    <td className={s.td}>
                      <div className={s.applicant}>
                        <span
                          className={s.avatar}
                          aria-hidden
                          style={{
                            background: `oklch(91% 0.04 ${hue})`,
                            color: `oklch(36% 0.12 ${hue})`,
                          }}
                        >
                          {initials(row.customerName)}
                        </span>
                        <div className={s.applicantInfo}>
                          <span className={s.applicantName}>{row.customerName}</span>
                          <span className={s.applicantPhone}>{row.customerPhone}</span>
                        </div>
                      </div>
                    </td>
                    <td className={s.td}>
                      <span className={cn(s.chip, s.docTypeChip)}>
                        {DOC_TYPE_LABEL[row.docType] ?? row.docType}
                      </span>
                    </td>
                    <td className={s.td}>
                      <span className={s.applicantPhone}>{row.docNumber ?? '—'}</span>
                    </td>
                    <td className={s.td}>
                      <span className={cn(s.chip, s.levelChip)}>{row.level}</span>
                    </td>
                    <td className={s.td}>
                      <span className={s.date}>
                        {formatDate(row.createdAt)}
                        {urgent && (
                          <span className={s.chip} style={{ marginInlineStart: '6px' }}>
                            فوری
                          </span>
                        )}
                      </span>
                    </td>
                    <td className={s.td}>
                      <div className={s.actions}>
                        <button
                          type="button"
                          className={s.previewBtn}
                          onClick={() => setPreview(row)}
                          aria-label={`مشاهده مدرک ${row.customerName}`}
                        >
                          <Eye size={13} aria-hidden />
                          جزئیات
                        </button>
                        {canWrite && (
                          <>
                            <button
                              type="button"
                              className={s.approveBtn}
                              onClick={() => approve(row)}
                              disabled={actionLocked}
                              aria-label={`تأیید KYC ${row.customerName}`}
                            >
                              <CheckCircle2 size={13} aria-hidden />
                              تأیید
                            </button>
                            <button
                              type="button"
                              className={s.rejectBtn}
                              onClick={() => {
                                setRejectTarget(row);
                                setRejectReason('');
                              }}
                              disabled={actionLocked}
                              aria-label={`رد KYC ${row.customerName}`}
                            >
                              <XCircle size={13} aria-hidden />
                              رد
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Preview Sheet ─────────────────────────────────────────── */}
      <Sheet open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <SheetContent dir="rtl" side="left" className="w-[420px] max-w-full overflow-y-auto">
          {preview && (
            <>
              <SheetTitle className="sr-only">پیش‌نمایش مدرک</SheetTitle>
              <div className={s.sheetBody}>
                <div className={s.sheetHeader}>
                  <span
                    className={s.sheetAvatar}
                    aria-hidden
                    style={{
                      background: `oklch(91% 0.04 ${nameHue(preview.customerName)})`,
                      color: `oklch(36% 0.12 ${nameHue(preview.customerName)})`,
                    }}
                  >
                    {initials(preview.customerName)}
                  </span>
                  <div className={s.sheetTitle}>
                    <span className={s.sheetName}>{preview.customerName}</span>
                    <span className={s.sheetMeta} dir="ltr">
                      {preview.customerPhone} · {exchangeName}
                    </span>
                  </div>
                </div>

                <div className={s.metaRows}>
                  <div className={s.metaRow}>
                    <span className={s.metaLabel}>نوع مدرک</span>
                    <span className={s.metaValue}>
                      {DOC_TYPE_LABEL[preview.docType] ?? preview.docType}
                    </span>
                  </div>
                  <div className={s.metaRow}>
                    <span className={s.metaLabel}>شماره مدرک</span>
                    <span className={s.metaValue} dir="ltr">
                      {preview.docNumber ?? '—'}
                    </span>
                  </div>
                  <div className={s.metaRow}>
                    <span className={s.metaLabel}>سطح درخواستی</span>
                    <span className={s.metaValue}>{preview.level}</span>
                  </div>
                  <div className={s.metaRow}>
                    <span className={s.metaLabel}>تاریخ ارسال</span>
                    <span className={s.metaValue}>{formatDate(preview.createdAt)}</span>
                  </div>
                </div>

                {preview.fileUrl ? (
                  <div className={s.docBlock}>
                    <p className={s.docBlockLabel}>تصویر مدرک</p>
                    <DocImage src={preview.fileUrl} alt={`مدرک ${preview.customerName}`} />
                  </div>
                ) : (
                  <div className={s.imgFallback}>
                    <FileText size={28} aria-hidden />
                    <span>مدرکی بارگذاری نشده</span>
                  </div>
                )}

                {canWrite && (
                  <div className={s.sheetActions}>
                    <Button
                      className="flex-1"
                      onClick={() => approve(preview)}
                      disabled={actionLocked}
                    >
                      <CheckCircle2 size={15} aria-hidden />
                      تأیید KYC
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRejectTarget(preview);
                        setPreview(null);
                      }}
                      disabled={actionLocked}
                    >
                      <XCircle size={15} aria-hidden />
                      رد
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Reject Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رد KYC — {rejectTarget?.customerName}</DialogTitle>
          </DialogHeader>
          <div className={s.dialogBody}>
            <span className={s.dialogLabel} id="exchange-kyc-reject-reason-label">
              دلیل رد (الزامی برای رد):
            </span>
            <Textarea
              aria-labelledby="exchange-kyc-reject-reason-label"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              dir="rtl"
              placeholder="مثلاً: تصویر ناخوانا / تاریخ انقضا گذشته / مغایرت هویتی"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={isPending}>
              انصراف
            </Button>
            <Button variant="destructive" onClick={confirmReject} disabled={isPending}>
              {isPending ? 'در حال ارسال…' : 'رد کردن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
