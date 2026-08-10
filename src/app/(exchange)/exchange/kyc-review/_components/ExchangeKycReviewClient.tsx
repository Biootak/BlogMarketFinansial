'use client';

/**
 * ExchangeKycReviewClient — Vault Command Center (Exchange Edition)
 *
 * Split-pane KYC review: queue cards (right) + persistent review panel (left).
 * Uses --at-* tokens (exchange design system) + shared primitives.
 * RTL-first, mobile-first, data from DB (no mocks).
 */

import { reviewCustomerKycRecord } from '@/actions/customer-portal';
import { MillionDollarEmpty } from '@/components/Dashboard/primitives/MillionDollarEmpty';
import { SearchInput } from '@/components/Dashboard/primitives/SearchInput';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  FileX2,
  ImageOff,
  Lock,
  Shield,
  Users,
  X,
  XCircle,
  ZoomIn,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import s from './ExchangeKycReviewClient.module.css';

const _faNum = new Intl.NumberFormat('fa-IR');

// ─── Types ────────────────────────────────────────────────────────────────

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
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const DOC_TYPE_LABEL: Record<string, string> = {
  NATIONAL_ID: 'تذکره / ملی',
  PASSPORT: 'پاسپورت',
  RESIDENCE_PERMIT: 'اجازه اقامت',
  SELFIE: 'سلفی',
  PHONE: 'تأیید موبایل',
};

const LEVEL_LABEL: Record<string, string> = {
  LEVEL_1: 'سطح ۱',
  LEVEL_2: 'سطح ۲',
  LEVEL_3: 'سطح ۳',
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'همین الان';
  if (mins < 60) return `${_faNum.format(mins)} دقیقه پیش`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${_faNum.format(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${_faNum.format(days)} روز پیش`;
  return formatDate(iso);
}

function isUrgent(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() > 2 * 24 * 60 * 60 * 1000;
}

// ─── DocImage ─────────────────────────────────────────────────────────────

function DocImage({ src, label, onZoom }: { src: string; label: string; onZoom?: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={s.imgFallback}>
        <FileX2 size={24} aria-hidden />
        <span>بارگذاری ناموفق</span>
      </div>
    );
  }

  return (
    <div className={s.docImgWrap}>
      {!loaded && (
        <div className={s.docImgSkeleton}>
          <FileText size={24} aria-hidden />
        </div>
      )}
      <Image
        src={src}
        alt={label}
        fill
        className={cn(s.docImg, loaded && s.docImgLoaded)}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
        unoptimized
        sizes="(max-width: 900px) 100vw, 400px"
      />
      <div className={s.docImgOverlay}>
        <span className={s.docImgLabel}>{label}</span>
        {onZoom && (
          <button type="button" className={s.docZoomBtn} onClick={onZoom} aria-label="بزرگنمایی">
            <ZoomIn size={14} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────

function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const hue = nameHue(name);
  return (
    <div
      className={cn(
        s.avatar,
        size === 'sm' && s.avatarSm,
        size === 'md' && s.avatarMd,
        size === 'lg' && s.avatarLg,
      )}
      style={{
        background: `oklch(90% 0.04 ${hue})`,
        color: `oklch(35% 0.12 ${hue})`,
      }}
    >
      {initials(name)}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export function ExchangeKycReviewClient({ records: initial, canWrite }: Props) {
  const [rows, setRows] = useState<ExchangeKycRow[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [rejectTarget, setRejectTarget] = useState<ExchangeKycRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [userCleared, _setUserCleared] = useState(false);

  const cooldownTick = useCallback(() => {
    setCooldown(1);
    setTimeout(() => setCooldown(0), 800);
  }, []);

  const actionLocked = cooldown > 0 || isPending;

  // KPI
  const kpi = useMemo(
    () => ({
      total: rows.length,
      withDoc: rows.filter((r) => r.fileUrl).length,
      withoutDoc: rows.filter((r) => !r.fileUrl).length,
      urgent: rows.filter((r) => isUrgent(r.createdAt)).length,
    }),
    [rows],
  );

  // Filtered
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone.includes(q) ||
        (r.docNumber ?? '').includes(q),
    );
  }, [rows, search]);

  // Selected row
  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  // Auto-select first when none selected (skip if user explicitly cleared)
  useEffect(() => {
    if (!userCleared && !selectedId && rows.length > 0) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId, userCleared]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!filtered.length || filtered.length === 1) return;
      const idx = filtered.findIndex((r) => r.id === selectedId);
      if (idx === -1) return;
      if (e.key === 'ArrowDown' && idx < filtered.length - 1) {
        e.preventDefault();
        setSelectedId(filtered[idx + 1].id);
      } else if (e.key === 'ArrowUp' && idx > 0) {
        e.preventDefault();
        setSelectedId(filtered[idx - 1].id);
      } else if (e.key === 'Escape') {
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filtered, selectedId]);

  // Approve
  const approve = useCallback(
    (row: ExchangeKycRow) => {
      if (actionLocked) return;
      cooldownTick();
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      if (selectedId === row.id) setSelectedId(null);
      startTransition(async () => {
        try {
          await reviewCustomerKycRecord({ recordId: row.id, approved: true });
          setLastAction(`KYC «${row.customerName}» تأیید شد`);
          setError(null);
        } catch (err: any) {
          setRows((prev) => [row, ...prev]);
          setError(err?.message || 'خطا در تأیید');
        }
      });
    },
    [actionLocked, cooldownTick, selectedId],
  );

  // Reject
  const confirmReject = useCallback(() => {
    if (!rejectTarget || actionLocked) return;
    if (!rejectReason.trim()) return;
    cooldownTick();
    const target = rejectTarget;
    setRows((prev) => prev.filter((r) => r.id !== target.id));
    if (selectedId === target.id) setSelectedId(null);
    setRejectTarget(null);
    setRejectReason('');
    startTransition(async () => {
      try {
        await reviewCustomerKycRecord({
          recordId: target.id,
          approved: false,
          rejectedReason: rejectReason.trim(),
        });
        setLastAction(`KYC «${target.customerName}» رد شد`);
        setError(null);
      } catch (err: any) {
        setRows((prev) => [target, ...prev]);
        setError(err?.message || 'خطا در رد');
      }
    });
  }, [rejectTarget, rejectReason, actionLocked, cooldownTick, selectedId]);

  return (
    <div className={s.root} dir="rtl">
      {/* ── Controls Bar ─────────────────────────────────────────────── */}
      <div className={s.controlsBar}>
        <div className={s.controlsRight}>
          {/* KPI Strip */}
          <div className={s.kpiStrip} aria-label="خلاصه صف KYC">
            <div
              className={s.kpiCard}
              style={
                {
                  '--kpi-accent': 'var(--at-accent)',
                  '--kpi-delay': '0ms',
                } as React.CSSProperties
              }
            >
              <div className={s.kpiIcon}>
                <Users size={14} aria-hidden />
              </div>
              <span className={s.kpiValue}>{_faNum.format(kpi.total)}</span>
              <span className={s.kpiLabel}>در انتظار بررسی</span>
            </div>
            <div
              className={s.kpiCard}
              style={
                {
                  '--kpi-accent': 'var(--at-info)',
                  '--kpi-delay': '60ms',
                } as React.CSSProperties
              }
            >
              <div className={s.kpiIcon}>
                <FileText size={14} aria-hidden />
              </div>
              <span className={s.kpiValue}>{_faNum.format(kpi.withDoc)}</span>
              <span className={s.kpiLabel}>با مدرک</span>
            </div>
            <div
              className={s.kpiCard}
              style={
                {
                  '--kpi-accent': 'var(--at-warning)',
                  '--kpi-delay': '120ms',
                } as React.CSSProperties
              }
            >
              <div className={s.kpiIcon}>
                <Clock size={14} aria-hidden />
              </div>
              <span className={s.kpiValue}>{_faNum.format(kpi.urgent)}</span>
              <span className={s.kpiLabel}>فوری (بیش از ۲ روز)</span>
            </div>
          </div>
        </div>
        <div className={s.controlsLeft}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="جستجوی نام، شماره، مدرک..."
            ariaLabel="جستجوی KYC"
          />
        </div>
      </div>

      {/* ── Notices ──────────────────────────────────────────────────── */}
      {lastAction && (
        <output className={s.bannerSuccess} aria-live="polite">
          <CheckCircle2 size={14} aria-hidden />
          {lastAction}
        </output>
      )}
      {error && (
        <div className={s.bannerError} role="alert">
          <AlertCircle size={14} aria-hidden />
          {error}
        </div>
      )}
      {!canWrite && (
        <output className={s.readOnlyNote}>
          <Lock size={13} aria-hidden />
          دسترسی خواندنی — تأیید/رد توسط OWNER یا MANAGER صرافی انجام می‌شود.
        </output>
      )}

      {/* ── Empty State ──────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <MillionDollarEmpty
          title="صف KYC خالی است"
          description="هیچ درخواست احراز هویتی در انتظار بررسی نیست. به‌محض اینکه مشتری مدارک ارسال کند، اینجا نمایش داده می‌شود."
          tone="emerald"
          eyebrow="صف KYC"
        />
      ) : filtered.length === 0 && search.trim() ? (
        <MillionDollarEmpty
          title="نتیجه‌ای یافت نشد"
          description="عبارت جستجو را تغییر دهید."
          tone="amber"
          eyebrow="نتیجه جستجو"
        />
      ) : (
        /* ── Split Pane ─────────────────────────────────────────────── */
        <div className={s.splitPane}>
          {/* Queue Pane (right) */}
          <div className={s.queuePane}>
            <div className={s.queueHeader}>
              <span className={s.queueCount}>
                {_faNum.format(filtered.length)} درخواست
                {search.trim() && <> از {_faNum.format(rows.length)}</>}
              </span>
              {selectedId && (
                <button
                  type="button"
                  className={s.clearSelectBtn}
                  onClick={() => setSelectedId(null)}
                >
                  <X size={12} aria-hidden />
                  لغو انتخاب
                </button>
              )}
            </div>
            <div className={s.cardList} role="listbox" aria-label="صف KYC" tabIndex={0}>
              {filtered.map((row, i) => {
                const isSelected = row.id === selectedId;
                const urgent = isUrgent(row.createdAt);
                return (
                  <button
                    key={row.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(s.queueCard, isSelected && s.queueCardSelected)}
                    style={
                      {
                        '--card-i': i,
                      } as React.CSSProperties
                    }
                    onClick={() => setSelectedId(row.id)}
                  >
                    {/* Accent stripe */}
                    <div
                      className={s.cardStripe}
                      style={{
                        background: urgent ? 'var(--at-danger)' : 'var(--at-accent)',
                      }}
                    />
                    <div className={s.cardBody}>
                      <div className={s.cardTop}>
                        <Avatar name={row.customerName} size="sm" />
                        <div className={s.cardIdentity}>
                          <span className={s.cardName}>{row.customerName}</span>
                          <span className={s.cardMeta}>{row.customerPhone}</span>
                        </div>
                        {urgent && (
                          <span className={s.urgentBadge}>
                            <span className={s.urgentDot} />
                            فوری
                          </span>
                        )}
                      </div>
                      <div className={s.cardBottom}>
                        <div className={s.cardChips}>
                          <span className={s.chipDocType}>
                            {DOC_TYPE_LABEL[row.docType] ?? row.docType}
                          </span>
                          <span className={s.chipLevel}>{LEVEL_LABEL[row.level] ?? row.level}</span>
                          <span className={s.chipTime}>{timeAgo(row.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    {/* Selected indicator */}
                    {isSelected && (
                      <div className={s.cardSelectedIndicator}>
                        <div className={s.cardSelectedDot} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Review Pane (left) */}
          <div className={s.reviewPane}>
            {selected ? (
              <div className={s.reviewContent}>
                <div className={s.reviewInner}>
                  {/* Header */}
                  <div className={s.reviewHeader}>
                    <Avatar name={selected.customerName} size="md" />
                    <div className={s.reviewTitleGroup}>
                      <span className={s.reviewName}>{selected.customerName}</span>
                      <span className={s.reviewMeta}>{selected.customerPhone}</span>
                    </div>
                  </div>

                  {/* Meta Grid */}
                  <div className={s.metaGrid}>
                    <div className={s.metaItem}>
                      <span className={s.metaLabel}>نوع مدرک</span>
                      <span className={s.metaValue}>
                        {DOC_TYPE_LABEL[selected.docType] ?? selected.docType}
                      </span>
                    </div>
                    <div className={s.metaItem}>
                      <span className={s.metaLabel}>سطح KYC</span>
                      <span className={s.metaValue}>
                        {LEVEL_LABEL[selected.level] ?? selected.level}
                      </span>
                    </div>
                    {selected.docNumber && (
                      <div className={s.metaItem}>
                        <span className={s.metaLabel}>شماره مدرک</span>
                        <span className={s.metaValue}>{selected.docNumber}</span>
                      </div>
                    )}
                    <div className={s.metaItem}>
                      <span className={s.metaLabel}>تاریخ ارسال</span>
                      <span className={s.metaValue}>{formatDate(selected.createdAt)}</span>
                    </div>
                    {isUrgent(selected.createdAt) && (
                      <div className={s.metaItem}>
                        <span className={s.metaLabel}>وضعیت</span>
                        <span className={s.metaValue} style={{ color: 'var(--at-danger)' }}>
                          ⚠ فوری — بیش از ۲ روز
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Document Grid */}
                  {selected.fileUrl ? (
                    <div className={s.docGrid}>
                      <DocImage
                        src={selected.fileUrl ?? ''}
                        label={`مدرک ${selected.customerName}`}
                        onZoom={() => window.open(selected.fileUrl ?? undefined, '_blank')}
                      />
                    </div>
                  ) : (
                    <div className={s.noDocs}>
                      <ImageOff size={24} aria-hidden />
                      <span>مدارکی بارگذاری نشده</span>
                    </div>
                  )}

                  {/* Actions */}
                  {canWrite ? (
                    <div className={s.reviewActions}>
                      <Button
                        className={s.approveBtn}
                        onClick={() => approve(selected)}
                        disabled={actionLocked}
                      >
                        <CheckCircle2 size={15} aria-hidden />
                        {isPending ? 'در حال تأیید…' : 'تأیید KYC'}
                      </Button>
                      <Button
                        variant="outline"
                        className={s.rejectBtn}
                        onClick={() => setRejectTarget(selected)}
                        disabled={actionLocked}
                      >
                        <XCircle size={15} aria-hidden />
                        رد
                      </Button>
                    </div>
                  ) : (
                    <div className={s.readOnlyActions}>
                      <Lock size={13} aria-hidden />
                      دسترسی خواندنی — عملیات توسط OWNER یا MANAGER
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={s.reviewPlaceholder}>
                <div className={s.placeholderIcon}>
                  <Shield size={28} aria-hidden />
                </div>
                <span className={s.placeholderTitle}>انتخاب کنید</span>
                <span className={s.placeholderDesc}>
                  یک درخواست از لیست انتخاب کنید تا جزئیات و مدارک در اینجا نمایش داده شود.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reject Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رد KYC — {rejectTarget?.customerName}</DialogTitle>
            <div className={s.rejectProfile}>
              {rejectTarget && <Avatar name={rejectTarget.customerName} size="sm" />}
              <span className={s.rejectName}>{rejectTarget?.customerPhone}</span>
            </div>
          </DialogHeader>
          <div>
            <label className={s.dialogLabel} id="exchange-kyc-reject-reason-label">
              دلیل رد (الزامی):
            </label>
            <Textarea
              className={s.dialogTextarea}
              aria-labelledby="exchange-kyc-reject-reason-label"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              dir="rtl"
              placeholder="مثلا: تصویر ناخوانا / تاریخ انقضا گذشته / مغایرت هویتی"
              autoFocus
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={isPending}>
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={isPending || !rejectReason.trim()}
            >
              {isPending ? 'در حال ارسال…' : 'رد کردن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
